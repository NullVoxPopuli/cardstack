/* eslint-disable no-unused-vars */
import { WalletProvider } from '../wallet-providers';
import BN from 'bn.js';
import { TransactionReceipt } from 'web3-core';
import { DepotSafe } from '@cardstack/cardpay-sdk/sdk/safes';

export interface Web3Strategy {
  chainName: string;
  isConnected: boolean;
  walletConnectUri: string | undefined;
  disconnect(): Promise<void>;
}

export interface Layer1Web3Strategy extends Web3Strategy {
  defaultTokenBalance: BN | undefined;
  currentProviderId: string | undefined;
  daiBalance: BN | undefined;
  cardBalance: BN | undefined;
  connect(walletProvider: WalletProvider): Promise<void>;
  waitForAccount: Promise<void>;
  approve(amountInWei: BN, token: string): Promise<TransactionReceipt>;
  relayTokens(
    token: ChainAddress,
    destinationAddress: ChainAddress,
    amountInWei: BN
  ): Promise<TransactionReceipt>;
  blockExplorerUrl(txnHash: TransactionHash): string;
  bridgeExplorerUrl(txnHash: TransactionHash): string;
}

export interface Layer2Web3Strategy extends Web3Strategy {
  defaultTokenBalance: BN | undefined;
  updateUsdConverters(
    symbolsToUpdate: ConvertibleSymbol[]
  ): Promise<Record<ConvertibleSymbol, ConversionFunction>>;
  blockExplorerUrl(txnHash: TransactionHash): string;
  getBlockHeight(): Promise<BN>;
  awaitBridged(
    fromBlock: BN,
    receiver: ChainAddress
  ): Promise<TransactionReceipt>;
  fetchDepot(owner: ChainAddress): Promise<DepotSafe | null>;
}

export type TransactionHash = string;
export type ChainAddress = string;

export type ConvertibleSymbol = 'DAI' | 'CARD';
export type ConversionFunction = (amountInWei: string) => number; // eslint-disable-line no-unused-vars
