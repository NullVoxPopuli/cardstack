import Web3 from 'web3';
import ERC20ABI from '../contracts/abi/erc-20';
import { AbiItem } from 'web3-utils';
import { ContractOptions } from 'web3-eth-contract';
import {
  gasEstimate,
  executeTransaction,
  getNextNonceFromEstimate,
  Operation,
  gasInToken,
  baseGasBuffer,
  createSafe,
  getParamsFromEvent,
  EventABI,
} from './utils/safe-utils';
import { signSafeTx } from './utils/signing-utils';
import BN from 'bn.js';
import { query } from './utils/graphql';
import type { SuccessfulTransactionReceipt } from './utils/successful-transaction-receipt';
import {
  TransactionOptions,
  waitForTransactionConsistency,
  isTransactionHash,
  sendTransaction,
  Transaction,
  waitUntilTransactionMined,
  generateSaltNonce,
} from './utils/general-utils';
import { Signer } from 'ethers';
const { fromWei } = Web3.utils;

/**
 * @group Cardpay
 */
export interface ISafes {
  viewSafe(safeAddress: string): Promise<ViewSafeResult>;
  view(options?: Partial<Options>): Promise<ViewSafesResult>;
  view(owner?: string): Promise<ViewSafesResult>;
  view(owner?: string, options?: Partial<Options>): Promise<ViewSafesResult>;
  sendTokensGasEstimate(safeAddress: string, tokenAddress: string, recipient: string, amount: string): Promise<string>;
  sendTokens(txnHash: string): Promise<SuccessfulTransactionReceipt>;
  sendTokens(
    safeAddress: string,
    tokenAddress: string,
    recipient: string,
    amount?: string,
    txnOptions?: TransactionOptions,
    contractOptions?: ContractOptions
  ): Promise<SuccessfulTransactionReceipt>;
}

/**
 * @group Cardpay
 */
export type Safe = DepotSafe | PrepaidCardSafe | MerchantSafe | RewardSafe | ExternalSafe;
interface BaseSafe {
  address: string;
  createdAt: number;
  tokens: TokenInfo[];
  owners: string[];
}
/**
 * @group Cardpay
 */
export interface DepotSafe extends BaseSafe {
  type: 'depot';
  infoDID?: string;
}
/**
 * @group Cardpay
 */
export interface MerchantSafe extends BaseSafe {
  type: 'merchant';
  accumulatedSpendValue: number;
  merchant: string;
  infoDID?: string;
}

/**
 * @group Cardpay
 */
export interface RewardSafe extends BaseSafe {
  type: 'reward';
  rewardProgramId: string;
}

/**
 * @group Cardpay
 */
export interface ExternalSafe extends BaseSafe {
  type: 'external';
}
/**
 * @group Cardpay
 */
export interface PrepaidCardSafe extends BaseSafe {
  type: 'prepaid-card';
  issuingToken: string;
  spendFaceValue: number;
  prepaidCardOwner: string;
  hasBeenUsed: boolean;
  issuer: string;
  reloadable: boolean;
  transferrable: boolean;
  customizationDID?: string;
}
/**
 * @group Cardpay
 */
export interface TokenInfo {
  tokenAddress: string;
  token: {
    name: string;
    symbol: string;
    decimals: number;
  };
  balance: string; // balance is in native units of the token (e.g. wei)
}

/**
 * @group Cardpay
 */
export interface Options {
  viewAll: boolean;
  type?: Safe['type'];
}
const defaultOptions: Options = { viewAll: false };

/**
 * @group Cardpay
 */
export interface CreateSafeResult {
  safeAddress: string;
}

/**
 * @group Cardpay
 */
export interface ViewSafeResult {
  safe: Safe | undefined;
  blockNumber: number;
}
/**
 * @group Cardpay
 */
export interface ViewSafesResult {
  safes: Safe[];
  blockNumber: number;
}

const safeQueryFields = `
  id
  createdAt
  owners {
    owner {
      id
    }
  }
  tokens {
    balance
    token {
      id
      name
      symbol
    }
  }
  depot {
    id
    infoDid
  }
  prepaidCard {
    id
    customizationDID
    issuingToken {
      symbol
      id
    }
    faceValue
    payments {
      id
    }
    issuer {
      id
    }
    owner {
      id
    }
    reloadable
  }
  merchant {
    id
    spendBalance
    infoDid
    merchant {
      id
    }
  }
  reward {
    id
    rewardee {
      id
    }
    rewardProgram {
      id
    }
  }
`;

const safeQuery = `
  query ($id: ID!) {
    safe(id: $id) {
      ${safeQueryFields}
    }
    _meta {
      block {
        number
      }
    }
  }
`;

const safesQuery = `
  query($account: ID!) {
    account(id: $account) {
      safes(orderBy:ownershipChangedAt orderDirection:desc) {
        safe {
          ${safeQueryFields}
        }
      }
    }

    _meta {
      block {
        number
      }
    }
  }
`;

const safesFilteredQuery = `
  query($account: ID!, $type: String) {
    account(id: $account) {
      safes(orderBy:ownershipChangedAt orderDirection:desc, where: {type: $type}) {
        safe {
          ${safeQueryFields}
        }
      }
    }

    _meta {
      block {
        number
      }
    }
  }
`;

/**
 * @group Cardpay
 */
export async function viewSafe(network: 'gnosis' | 'sokol', safeAddress: string): Promise<ViewSafeResult> {
  let {
    data: { safe, _meta },
  } = await query(network, safeQuery, { id: safeAddress });
  return {
    safe: processSafeResult(safe as GraphQLSafeResult),
    blockNumber: _meta.block.number,
  };
}

/**
 * The `Safes` API is used to query the card protocol about the gnosis safes in the layer 2 network in which the Card Protocol runs. This can includes safes in which bridged tokens are deposited as well as prepaid cards (which in turn are actually gnosis safes). The `Safes` API can be obtained from `getSDK()` with a `Web3` instance that is configured to operate on a layer 2 network (like Gnosis Chain or Sokol).
 * @example
 * ```ts
 *import { getSDK } from "@cardstack/cardpay-sdk";
 *let web3 = new Web3(myProvider); // Layer 2 web3 instance
 *let safes = await getSDK('Safes', web3);
 * ```
 * @group Cardpay
 * @category Main
 */
export default class Safes implements ISafes {
  constructor(private layer2Web3: Web3, private layer2Signer?: Signer) {}

  async createSafe(txnHash: string): Promise<CreateSafeResult>;
  async createSafe(
    tokenAddress: string,
    owners: string[],
    threshold: number,
    saltNonce?: string,
    txnOptions?: TransactionOptions
  ): Promise<CreateSafeResult>;
  async createSafe(
    tokenAddressOrTxnHash: string,
    owners?: string[],
    threshold?: number,
    saltNonce?: string,
    txnOptions?: TransactionOptions
  ): Promise<CreateSafeResult> {
    if (isTransactionHash(tokenAddressOrTxnHash)) {
      return {
        safeAddress: await this.getSafeAddressFromTransferTxn(tokenAddressOrTxnHash),
      };
    }
    let tokenAddress = tokenAddressOrTxnHash;
    owners = owners ? owners : [];
    threshold = threshold ? threshold : 0;

    if (owners.length <= 0) {
      throw new Error('must include at least one owner');
    }
    if (threshold <= 0) {
      throw new Error('threshold must be greater than zero');
    }
    let { onTxnHash } = txnOptions ?? {};

    saltNonce = saltNonce ? saltNonce : generateSaltNonce('cardstack-create-safe');
    let safeCreationTxResponse = await createSafe(this.layer2Web3, owners, threshold, saltNonce, tokenAddress);

    let token = new this.layer2Web3.eth.Contract(ERC20ABI as AbiItem[], tokenAddress);
    let transferData = token.methods.transfer(safeCreationTxResponse.safe, safeCreationTxResponse.payment).encodeABI();
    let transferTx: Transaction = {
      to: tokenAddress,
      value: '0',
      operation: Operation.CALL,
      data: transferData,
    };
    let txHash = await sendTransaction(this.layer2Web3, transferTx);

    if (!txHash) {
      throw new Error('Failed to create new safe');
    }

    if (typeof onTxnHash === 'function') {
      await onTxnHash(txHash);
    }

    return {
      safeAddress: safeCreationTxResponse.safe,
    };
  }

  async getSafeAddressFromTransferTxn(txnHash: string): Promise<string> {
    let receipt = await waitUntilTransactionMined(this.layer2Web3, txnHash);
    let params = getParamsFromEvent(this.layer2Web3, receipt, this.transferEventABI(), receipt.to);
    return params[0].to;
  }

  private transferEventABI(): EventABI {
    return {
      topic: this.layer2Web3.eth.abi.encodeEventSignature('Transfer(address,address,uint256)'),
      abis: [
        {
          name: 'from',
          type: 'address',
          indexed: true,
        },
        {
          name: 'to',
          type: 'address',
          indexed: true,
        },
        {
          name: 'amt',
          type: 'uint256',
        },
      ],
    };
  }

  /**
   * This call is used to view a specific safe in the layer 2 network in which the Card Protocol runs.
   * @param safeAddress
   * @returns promise for an object that contains a `Safe` and the block number at which the subgraph was last indexed:
   * @example
   * ```ts
   * let safeDetails = await safes.viewSafe(safeAddress); // returns { safe: Safe | undefined; blockNumber: number; }
   * ```
   */
  async viewSafe(safeAddress: string): Promise<ViewSafeResult> {
    let {
      data: { safe, _meta },
    } = await query(this.layer2Web3, safeQuery, { id: safeAddress });

    return {
      safe: processSafeResult(safe as GraphQLSafeResult),
      blockNumber: _meta.block.number,
    };
  }

  /**
   * This call is used to view all the gnosis safes owned by a particular address in the layer 2 network in which the Card Protocol runs.
   * @param owner Optionally the address of a safe owner. If no address is supplied, then the default account in your web3 provider's wallet will be used.
   * @returns a promise that includes an array of all the gnosis safes owned by the specified address. The result is an object contains a `Safe[]` type which conforms to the `Safe` shape below, and the block number at which the subgraph was last indexed:
   * @example
   * ```ts
   * let safeDetails = await safes.view(); // returns { safes: Safe[]; blockNumber: number; }
   * ```
   */
  async view(options?: Partial<Options>): Promise<ViewSafesResult>;
  async view(owner?: string): Promise<ViewSafesResult>;
  async view(owner?: string, options?: Partial<Options>): Promise<ViewSafesResult>;
  async view(ownerOrOptions?: string | Partial<Options>, options?: Partial<Options>): Promise<ViewSafesResult> {
    let owner: string;
    let _options: Options | undefined;
    if (typeof ownerOrOptions === 'string') {
      owner = ownerOrOptions;
    } else {
      owner = (await this.layer2Web3.eth.getAccounts())[0];
      _options = { ...defaultOptions, ...(ownerOrOptions ?? {}) };
    }
    _options = { ...defaultOptions, ...(options ?? _options ?? {}) };

    let account, _meta;
    if (options?.type) {
      let type = options.type === 'external' ? null : options.type;
      ({
        data: { account, _meta },
      } = await query(this.layer2Web3, safesFilteredQuery, { account: owner, type }));
    } else {
      ({
        data: { account, _meta },
      } = await query(this.layer2Web3, safesQuery, { account: owner }));
    }
    if (account == null) {
      return {
        safes: [],
        blockNumber: _meta.block.number,
      };
    }

    let { safes } = account;
    let result: Safe[] = [];
    for (let { safe } of safes as { safe: GraphQLSafeResult }[]) {
      let safeResult = processSafeResult(safe);
      if (safeResult) {
        if (_options.viewAll) {
          result.push(safeResult);
        } else if (safeResult.type === 'prepaid-card' && safeResult.spendFaceValue > 0) {
          result.push(safeResult);
        } else if (safeResult.type === 'merchant' || safeResult.type === 'depot' || safeResult.type === 'reward') {
          result.push(safeResult);
        }
      }
    }
    return {
      safes: result,
      blockNumber: _meta.block.number,
    };
  }

  /**
   * This call will return the gas estimate for sending tokens from a safe.
   * @param safeAddress  the address of the gnosis safe
   * @param tokenAddress  the address of the token contract
   * @param recipient the address of the recipient
   * @param amount optionally,  amount of tokens to send as a string in native units of the token (e.g. `wei`)
   * @remarks Note that the returned amount is in units of the token specified in the
   * function params, tokenAddress
   */
  async sendTokensGasEstimate(
    safeAddress: string,
    tokenAddress: string,
    recipient: string,
    amount: string
  ): Promise<string> {
    let token = new this.layer2Web3.eth.Contract(ERC20ABI as AbiItem[], tokenAddress);
    let safeBalance = new BN(await token.methods.balanceOf(safeAddress).call());
    if (safeBalance.lt(new BN(amount))) {
      throw new Error(
        `Gas Estimate: Safe does not have enough balance to transfer tokens. The token ${tokenAddress} balance of safe ${safeAddress} is ${fromWei(
          safeBalance.toString()
        )}, amount to transfer ${fromWei(amount)}`
      );
    }
    let payload = this.transferTokenPayload(tokenAddress, recipient, new BN(amount));
    let estimate = await gasEstimate(
      this.layer2Web3,
      safeAddress,
      tokenAddress,
      '0',
      payload,
      Operation.CALL,
      tokenAddress
    );
    return gasInToken(estimate).toString();
  }

  /**
   * This call is used to send tokens from a gnosis safe to an arbitrary address in the layer 2 network. Note that the gas will be paid with the token you are transferring so there must be enough token balance in teh safe to cover both the transferred amount of tokens and gas.
   * @param safeAddress  the address of the gnosis safe
   * @param tokenAddress  the address of the token contract
   * @param recipient the address of the recipient
   * @param amount optionally,  amount of tokens to send as a string in native units of the token (e.g. `wei`)
   * @returns a promise for a web3 transaction receipt.
   * @example
   * ```ts
   * let cardCpxd = await getAddress('cardCpxd', web3);
   *let result = await safes.sendTokens(
   *  depotSafeAddress,
   *  cardCpxd,
   *  relayTxnFunderAddress
   *  [10000000000000000000000]
   *);
   * ```
   * @remarks Note that the returned amount is in units of the token specified in the
   * function params, tokenAddress
   */
  async sendTokens(txnHash: string): Promise<SuccessfulTransactionReceipt>;
  async sendTokens(
    safeAddress: string,
    tokenAddress: string,
    recipient: string,
    amount?: string,
    txnOptions?: TransactionOptions,
    contractOptions?: ContractOptions
  ): Promise<SuccessfulTransactionReceipt>;
  async sendTokens(
    safeAddressOrTxnHash: string,
    tokenAddress?: string,
    recipient?: string,
    amount?: string,
    txnOptions?: TransactionOptions,
    contractOptions?: ContractOptions
  ): Promise<SuccessfulTransactionReceipt> {
    if (isTransactionHash(safeAddressOrTxnHash)) {
      let txnHash = safeAddressOrTxnHash;
      return waitForTransactionConsistency(this.layer2Web3, txnHash);
    }
    let safeAddress = safeAddressOrTxnHash;
    if (!tokenAddress) {
      throw new Error('tokenAddress must be specified');
    }
    if (!recipient) {
      throw new Error('recipient must be specified');
    }
    let { nonce, onNonce, onTxnHash } = txnOptions ?? {};
    let from = contractOptions?.from ?? (await this.layer2Web3.eth.getAccounts())[0];
    let token = new this.layer2Web3.eth.Contract(ERC20ABI as AbiItem[], tokenAddress);
    let symbol = await token.methods.symbol().call();
    let safeBalance = new BN(await token.methods.balanceOf(safeAddress).call());

    let estimate;
    let payload;
    if (amount) {
      let weiAmount = new BN(amount);
      if (safeBalance.lt(weiAmount)) {
        throw new Error(
          `Safe does not have enough balance to transfer tokens. The token ${tokenAddress} balance of safe ${safeAddress} is ${fromWei(
            safeBalance.toString()
          )}, amount to transfer ${fromWei(amount)}`
        );
      }
      payload = this.transferTokenPayload(tokenAddress, recipient, weiAmount);
      estimate = await gasEstimate(
        this.layer2Web3,
        safeAddress,
        tokenAddress,
        '0',
        payload,
        Operation.CALL,
        tokenAddress
      );
      let gasCost = gasInToken(estimate);
      if (safeBalance.lt(weiAmount.add(gasCost))) {
        throw new Error(
          `Safe does not have enough balance to pay for gas when transfer tokens. The token ${tokenAddress} balance of safe ${safeAddress} is ${fromWei(
            safeBalance.toString()
          )} ${symbol}, amount to transfer ${fromWei(amount)} ${symbol}, the gas cost is ${fromWei(gasCost)} ${symbol}`
        );
      }
    } else {
      //when amount is NOT given, we use safeBalance - gasCost as the transfer amount
      //Note: gasCost is estimated with safeBalance not the actual transfer amount
      let prePayload = this.transferTokenPayload(tokenAddress, recipient, safeBalance);
      // The preEstimate is used to estimate the gasCost to check that the safeBalance has sufficient leftover to pay for gas after transferring a specified amount
      // The preEstimate is typically used when transferring full balances from a safe
      let preEstimate = await gasEstimate(
        this.layer2Web3,
        safeAddress,
        tokenAddress,
        '0',
        prePayload,
        Operation.CALL,
        tokenAddress
      );
      preEstimate.baseGas = new BN(preEstimate.baseGas).add(baseGasBuffer).toString();
      let gasCost = gasInToken(preEstimate);
      if (safeBalance.lt(gasCost)) {
        throw new Error(
          `Safe does not have enough to pay for gas when transferring. The safe ${safeAddress} balance for token ${tokenAddress} is ${fromWei(
            safeBalance
          )}, the gas cost is ${fromWei(gasCost)}`
        );
      }
      let weiAmount = safeBalance.sub(gasCost);
      payload = this.transferTokenPayload(tokenAddress, recipient, weiAmount);
      // We must still compute a new gasEstimate based upon the adjusted amount for gas
      // This is beecause the relayer will do the estimation with the same exact parameters
      // and check that the gas estimates here are at least greater than its own gas estimates
      estimate = await gasEstimate(
        this.layer2Web3,
        safeAddress,
        tokenAddress,
        '0',
        payload,
        Operation.CALL,
        tokenAddress
      );
    }
    if (nonce == null) {
      nonce = getNextNonceFromEstimate(estimate);
      if (typeof onNonce === 'function') {
        onNonce(nonce);
      }
    }

    let result = await executeTransaction(
      this.layer2Web3,
      safeAddress,
      tokenAddress,
      payload,
      Operation.CALL,
      estimate,
      nonce,
      await signSafeTx(
        this.layer2Web3,
        safeAddress,
        tokenAddress,
        payload,
        Operation.CALL,
        estimate,
        nonce,
        from,
        this.layer2Signer
      )
    );

    let txnHash = result.ethereumTx.txHash;

    if (typeof onTxnHash === 'function') {
      await onTxnHash(txnHash);
    }
    return await waitForTransactionConsistency(this.layer2Web3, txnHash, safeAddress, nonce);
  }

  private transferTokenPayload(tokenAddress: string, recipient: string, amount: BN): string {
    let token = new this.layer2Web3.eth.Contract(ERC20ABI as AbiItem[], tokenAddress);
    return token.methods.transfer(recipient, amount).encodeABI();
  }
}

interface GraphQLSafeResult {
  id: string;
  createdAt: string;
  owners: {
    owner: {
      id: string;
    };
  }[];
  tokens: {
    balance: string;
    token: {
      id: string;
      name: string;
      symbol: string;
    };
  }[];
  depot: {
    id: string;
    infoDid: string | null;
  } | null;
  prepaidCard: {
    id: string;
    customizationDID: string | null;
    issuingToken: {
      symbol: string;
      id: string;
    };
    owner: {
      id: string;
    };
    payments: {
      id: string;
    }[];
    faceValue: string;
    issuer: { id: string };
    reloadable: boolean;
  } | null;
  merchant: {
    id: string;
    spendBalance: string;
    infoDid: string | null;
    merchant: {
      id: string;
    };
  };
  reward: {
    id: string;
    rewardProgram: {
      id: string;
    };
    rewardee: {
      id: string;
    };
  };
}

function processSafeResult(safe: GraphQLSafeResult): Safe | undefined {
  if (!safe) {
    return;
  }

  let tokens: TokenInfo[] = [];
  let createdAt = parseInt(safe.createdAt);
  for (let tokenDetail of safe.tokens) {
    tokens.push({
      tokenAddress: tokenDetail.token.id,
      balance: tokenDetail.balance,
      token: {
        name: tokenDetail.token.name,
        symbol: tokenDetail.token.symbol,
        // we should really get this from teh subgraph--but honestly having
        // a non-decimal 18 token messes so many other things up on-chain
        // that likely we'll never support a non-decimal 18 token
        decimals: 18,
      },
    });
  }
  let owners: string[] = [];
  for (let ownerInfo of safe.owners) {
    let {
      owner: { id: owner },
    } = ownerInfo;
    owners.push(owner);
  }
  if (safe.depot) {
    let depot: DepotSafe = {
      type: 'depot',
      address: safe.depot.id,
      infoDID: safe.depot.infoDid ? safe.depot.infoDid : undefined,
      tokens,
      createdAt,
      owners,
    };
    return depot;
  } else if (safe.merchant) {
    let merchant: MerchantSafe = {
      type: 'merchant',
      address: safe.merchant.id,
      infoDID: safe.merchant.infoDid ? safe.merchant.infoDid : undefined,
      accumulatedSpendValue: parseInt(safe.merchant.spendBalance),
      merchant: safe.merchant.merchant.id,
      tokens,
      createdAt,
      owners,
    };
    return merchant;
  } else if (safe.prepaidCard) {
    let prepaidCard: PrepaidCardSafe = {
      type: 'prepaid-card',
      address: safe.prepaidCard.id,
      customizationDID: safe.prepaidCard.customizationDID ? safe.prepaidCard.customizationDID : undefined,
      issuingToken: safe.prepaidCard.issuingToken.id,
      spendFaceValue: parseInt(safe.prepaidCard.faceValue),
      issuer: safe.prepaidCard.issuer.id,
      hasBeenUsed: safe.prepaidCard.payments.length > 0,
      reloadable: safe.prepaidCard.reloadable,
      transferrable: safe.prepaidCard.payments.length === 0 && safe.prepaidCard.issuer.id === safe.prepaidCard.owner.id,
      prepaidCardOwner: safe.prepaidCard.owner.id,
      tokens,
      createdAt,
      owners,
    };
    return prepaidCard;
  } else if (safe.reward) {
    let reward: RewardSafe = {
      type: 'reward',
      address: safe.reward.id,
      rewardProgramId: safe.reward.rewardProgram.id,
      tokens,
      createdAt,
      owners,
    };
    return reward;
  } else {
    let externalSafe: ExternalSafe = {
      type: 'external',
      address: safe.id,
      tokens,
      createdAt,
      owners,
    };
    return externalSafe;
  }
}
