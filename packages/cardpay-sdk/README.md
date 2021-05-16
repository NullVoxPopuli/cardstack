# cardpay-sdk <!-- omit in toc -->
This is a package that provides an SDK to use the Cardpay protocol.

### Special Considerations <!-- omit in toc -->
 One item to note that all token amounts that are provided to the API must strings and be in units of `wei`. All token amounts returned by the API will also be in units of `wei`. You can use `Web3.utils.toWei()` and `Web3.utils.fromWei()` to convert to and from units of `wei`. Because ethereum numbers can be so large, it is unsafe to represent these natively in Javascript, and in fact it is very common for a smart contract to return numbers that are simply too large to be represented natively in Javascript. For this reason, within Javascript the only safe way to natively handle numbers coming from Ethereum is as a `string`. If you need to perform math on a number coming from Ethereum use the `BN` library.

- [`TokenBridgeForeignSide`](#tokenbridgeforeignside)
  - [`TokenBridgeForeignSide.unlockTokens`](#tokenbridgeforeignsideunlocktokens)
  - [`TokenBridgeForeignSide.relayTokens`](#tokenbridgeforeignsiderelaytokens)
  - [`TokenBridgeForeignSide.getSupportedTokens` (TBD)](#tokenbridgeforeignsidegetsupportedtokens-tbd)
- [`TokenBridgeHomeSide`](#tokenbridgehomeside)
  - [`TokenBridgeHomeSide.waitForBridgingCompleted`](#tokenbridgehomesidewaitforbridgingcompleted)
- [`Safes`](#safes)
  - [`Safes.view`](#safesview)
- [`PrepaidCard`](#prepaidcard)
  - [`PrepaidCard.create`](#prepaidcardcreate)
  - [`PrepaidCard.priceForFaceValue`](#prepaidcardpriceforfacevalue)
  - [`PrepaidCard.gasFee`](#prepaidcardgasfee)
  - [`PrepaidCard.payMerchant`](#prepaidcardpaymerchant)
  - [`PrepaidCard.split` (TBD)](#prepaidcardsplit-tbd)
  - [`PrepaidCard.transfer` (TBD)](#prepaidcardtransfer-tbd)
- [`RevenuePool` (TBD)](#revenuepool-tbd)
  - [`RevenuePool.balanceOf` (TBD)](#revenuepoolbalanceof-tbd)
  - [`RevenuePool.withdraw` (TBD)](#revenuepoolwithdraw-tbd)
- [`RewardPool` (TBD)](#rewardpool-tbd)
  - [`RewardPool.balanceOf` (TBD)](#rewardpoolbalanceof-tbd)
  - [`RewardPool.withdraw` (TBD)](#rewardpoolwithdraw-tbd)
- [`ExchangeRate`](#exchangerate)
  - [`ExchangeRate.convertToSpend`](#exchangerateconverttospend)
  - [`ExchangeRate.convertFromSpend`](#exchangerateconvertfromspend)
  - [`ExchangeRate.getUSDPrice`](#exchangerategetusdprice)
  - [ExchangeRate.getUSDConverter](#exchangerategetusdconverter)
  - [`ExchangeRate.getETHPrice`](#exchangerategetethprice)
  - [`ExchangeRate.getUpdatedAt`](#exchangerategetupdatedat)
- [`getAddress`](#getaddress)
- [`getOracle`](#getoracle)
- [`getConstant`](#getconstant)
- [`networkIds`](#networkids)
- [ABI's](#abis)

## `TokenBridgeForeignSide`
The `TokenBridge` API is used to bridge tokens into the layer 2 network in which the Card Protocol runs. The `TokenBridgeForeignSide` class should be instantiated with your `Web3` instance that is configured to operate on a layer 1 network (like Ethereum Mainnet or Kovan).
```js
import { TokenBridgeForeignSide } from "@cardstack/cardpay-sdk";
let web3 = new Web3(myProvider);
let tokenBridge = new TokenBridgeForeignSide(web3); // Layer 1 web3 instance
```

### `TokenBridgeForeignSide.unlockTokens`
This call will perform an ERC-20 `approve` action on the tokens to grant the Token Bridge contract the ability bridge your tokens. This method is invoked with:
- The contract address of the token that you are unlocking. Note that the token address must be a supported stable coin token. Use the `TokenBridgeForeignSide.getSupportedTokens` method to get a list of supported tokens.
- The amount of tokens to unlock. This amount should be in units of `wei` and as string.
- You can optionally provide an object that specifies the from address, gas limit, and/or gas price as a third argument.

This method returns a promise that includes a web3 transaction receipt, from which you can obtain the transaction hash, ethereum events, and other details about the transaction https://web3js.readthedocs.io/en/v1.3.4/web3-eth-contract.html#id37.

```js
let txnReceipt = await tokenBridge.unlockTokens(
  "0x4F96Fe3b7A6Cf9725f59d353F723c1bDb64CA6Aa",
  new BN("1000000000000000000") // this is 1 token in wei
);
```
### `TokenBridgeForeignSide.relayTokens`
This call will invoke the token bridge contract to relay tokens that have been unlocked. It is always a good idea to relay the same number of tokens that were just unlocked. So if you unlocked 10 tokens, then you should subsequently relay 10 tokens. Once the tokens have been relayed to the layer 2 network they will be deposited in a Gnosis safe that you control in layer 2. You can use the `Safes.view` to obtain the address of the safe that you control in layer 2. Your safe will be reused for any subsequent tokens that you bridge into layer 2.

This method is invoked with the following parameters:
- The contract address of the token that you are unlocking. Note that the token address must be a supported stable coin token. Use the `TokenBridgeForeignSide.getSupportedTokens` method to get a list of supported tokens.
- The address of the layer 2 account that should own the resulting safe
- The amount of tokens to unlock. This amount should be in units of `wei` and as a string.
- You can optionally provide an object that specifies the from address, gas limit, and/or gas price as a fourth argument.

This method returns a promise that includes a web3 transaction receipt, from which you can obtain the transaction hash, ethereum events, and other details about the transaction https://web3js.readthedocs.io/en/v1.3.4/web3-eth-contract.html#id37.

```js
let txnReceipt = await tokenBridge.relayTokens(
  "0x4F96Fe3b7A6Cf9725f59d353F723c1bDb64CA6Aa", // token address
  "0x7cc103485069bbba15799f5dac5c42e7bbb48b4d064e61548022bf04db1bfc19", // layer 2 recipient address
  new BN("1000000000000000000") // this is 1 token in wei
);
```

### `TokenBridgeForeignSide.getSupportedTokens` (TBD)

## `TokenBridgeHomeSide`
The `TokenBridge` API is used to bridge tokens into the layer 2 network in which the Card Protocol runs. The `TokenBridgeHomeSide` class should be instantiated with your `Web3` instance that is configured to operate on a layer 2 network (like xDai or Sokol).
```js
import { TokenBridgeHomeSide } from "@cardstack/cardpay-sdk";
let web3 = new Web3(myProvider);
let tokenBridge = new TokenBridgeHomeSide(web3); // Layer 2 web3 instance
```

### `TokenBridgeHomeSide.waitForBridgingCompleted`
This call will listen for a `TokensBridgedToSafe` event emitted by the TokenBridge home contract that has a recipient matching the specified address. The starting layer 2 block height should be captured before the call to relayTokens is made to begin bridging. It is used to focus the search and avoid matching on a previous bridging for this user.

This method is invoked with the following parameters:
- The address of the layer 2 account that will own the resulting safe (passed as receiver to relayTokens call)
- The block height of layer 2 before the relayTokens call was initiated on the foreign side of the bridge. Get it with `await layer2Web3.eth.getBlockNumber()`

This method returns a promise that includes a web3 transaction receipt for the layer 2 transaction, from which you can obtain the transaction hash, ethereum events, and other details about the transaction https://web3js.readthedocs.io/en/v1.3.4/web3-eth-contract.html#id37.


```js
let txnReceipt = await tokenBridge.waitForBridgingCompleted(
  recipientAddress
  startingBlockHeight,
);
```

## `Safes`
The `Safes` API is used to query the card protocol about the gnosis safes in the layer 2 network in which the Card Protocol runs. This can includes safes in which bridged tokens are deposited as well as prepaid cards (which in turn are actually gnosis safes). The `Safes` class should be instantiated with your `Web3` instance that is configured to operate on a layer 2 network (like xDai or Sokol).
```js
import { Safes } from "@cardstack/cardpay-sdk";
let web3 = new Web3(myProvider);
let safes = new Safes(web3); // Layer 2 web3 instance
```

### `Safes.view`
This call is used to view the gnosis safes owned by a particular address in the layer 2 network in which the Card Protocol runs.

This method is invoked with the following parameters:
- Optionally the address of a safe owner. If no address is supplied, then the default account in your web3 provider's wallet will be used.

This method returns a promise that includes an array of all the gnosis safes owned by the specified address. The result is an object that is a `Safe[]` type which conforms to the `Safe` shape below:

```ts
export type Safe = DepotSafe | PrepaidCardSafe | MerchantSafe | ExternalSafe;
interface BaseSafe {
  address: string;
  tokens: TokenInfo[];
}
interface DepotSafe extends BaseSafe {
  type: 'depot';
}
interface MerchantSafe extends BaseSafe {
  type: 'merchant';
}
interface ExternalSafe extends BaseSafe {
  type: 'external';
}
interface PrepaidCardSafe extends BaseSafe {
  type: 'prepaid-card';
  issuingToken: string;
  spendFaceValue: number;
  issuer: string;
}
```

Which can be called like this:
```js
let safeDetails = await safes.view();
```

## `PrepaidCard`
The `PrepaidCard` API is used to create and interact with prepaid cards within the layer 2 network in which the Card Protocol runs. The `PrepaidCard` class should be instantiated with your `Web3` instance that is configured to operate on a layer 2 network (like xDai or Sokol).
```js
import { PrepaidCard } from "@cardstack/cardpay-sdk";
let web3 = new Web3(myProvider);
let prepaidCard = new PrepaidCard(web3); // Layer 2 web3 instance
```

### `PrepaidCard.create`
This call will create a new prepaid card from a gnosis safe, specifically a gnosis safe that holds tokens that were bridged to the layer 2 network from teh `TokenBridge` api. From this call you can create 1 or more prepaid cards from the `*.CPXD` layer 2 tokens (in the xDai network, for example). When a token is bridged to a layer 2 network like xDai, it will obtain a `*.CPXD` suffix, indicating that it can participate in the Card Protocol on xDai. The face value for the prepaid card does not include the amount of tokens consumed by the gas to create the card as well as fees to create a prepaid card.
```
total cost in *.CPXD = (Face value in § * token exchange rate) + fees + gas
```
Note that gas is charged in the `*.CPXD` token which will be deducted from your safe. You can use the `PrepaidCard.costForFaceValue` method to determine what the final cost for a card with a particular face value in units of **§** will be in the token of your choosing. You can use this amount to create the desired face value for your prepaid card.

This method is invoked with the following parameters:
- The address of the safe that you are using to pay for the prepaid card
- The contract address of the token that you wish to use to pay for the prepaid card. Note that the face value of the prepaid card will fluctuate based on the exchange rate of this token and the **§** unit.
- An array of face values in units of **§** SPEND as numbers. Note there is a maximum of 15 prepaid cards that can be created in a single transaction and a minimum face value of **§100** is enforced for each card.
- You can optionally provide an object that specifies the "from" address. The gas price and gas limit will be calculated by the card protocol and are not configurable.

```js
let daicpxd = await getAddress('daiCpxd', web3);
let result = await prepaidCard.create(
  safeAddress,
  daicpxd,
  [5000] // §5000 SPEND face value
);
```

This method returns a promise for a gnosis relay transaction object that has the following shape:
```ts
interface RelayTransaction {
  to: string;
  ethereumTx: {
    txHash: string;
    to: string;
    data: string;
    blockNumber: string;
    blockTimestamp: string;
    created: string;
    modified: string;
    gasUsed: string;
    status: number;
    transactionIndex: number;
    gas: string;
    gasPrice: string;
    nonce: string;
    value: string;
    from: string;
  };
  value: number;
  data: string;
  timestamp: string;
  operation: string;
  safeTxGas: number;
  dataGas: number;
  gasPrice: number;
  gasToken: string;
  refundReceiver: string;
  nonce: number;
  safeTxHash: string;
  txHash: string;
  transactionHash: string;
}
```

### `PrepaidCard.priceForFaceValue`
This call will return the price in terms of the specified token of how much it costs to have a face value in the specified units of SPEND (**§**). This takes into account both the exchange rate of the specified token as well as gas fees that are deducted from the face value when creating a prepaid card. Note though, that the face value of the prepaid card in SPEND will drift based on the exchange rate of the underlying token used to create the prepaid card. (However, this drift should be very slight since we are using *stable* coins to purchase prepaid cards (emphasis on "stable"). Since the units of SPEND are very small relative to wei (**§** 1 === $0.01 USD), the face value input is a number type. This API returns the amount of tokens required to achieve a particular face value as a string in units of `wei` of the specified token.
```js
// You must send 'amountInDai' to the prepaidCardManager contract
// to achieve a prepaid card with §5000 face value
let amountInDAI = await prepaidCard.priceForFaceValue(daiCpxdAddress, 5000);
```

Note that if you are creating multiple cards or splitting cards, use this API to ensure the amount to provision for each prepaid card you want to create in order to achieve teh desired face values for each of the prepaid cards created.

### `PrepaidCard.gasFee`
This call will return the gas fee in terms of the specified token for the creation of a prepaid card. All prepaid cards will be seeded with some `CARD.CPXD` in order to pay our gnosis safe relayer for gas. In order to offset these costs, a small fee will be charged when creating or splitting a prepaid card. The gas fee that is charged is returned as a string value in units of `wei` of the specified token. This is the same fee that is accounted for in the `PrepaidCard.priceForFaceValue` API.
```js
let gasFeeInDai = await prepaidCard.gasFee(daiCpxdAddress);
```

### `PrepaidCard.payMerchant`
This call will pay a merchant from a prepaid card.

The arguments are:
- The safe address of the merchant that will be receiving payment
- The prepaid card address to use to pay the merchant
- The amount of **§** SPEND to pay the merchant.
- You can optionally provide an object that specifies the "from" address. The gas price and gas limit will be calculated by the card protocol and are not configurable.

```js
let result = await prepaidCard.payMerchant(
  merchantSafeAddress,
  prepaidCardAddress
  5000 // Pay the merchant §5000 SPEND
);
```

This method returns a promise for a gnosis relay transaction object that has the following shape:
```ts
interface RelayTransaction {
  to: string;
  ethereumTx: {
    txHash: string;
    to: string;
    data: string;
    blockNumber: string;
    blockTimestamp: string;
    created: string;
    modified: string;
    gasUsed: string;
    status: number;
    transactionIndex: number;
    gas: string;
    gasPrice: string;
    nonce: string;
    value: string;
    from: string;
  };
  value: number;
  data: string;
  timestamp: string;
  operation: string;
  safeTxGas: number;
  dataGas: number;
  gasPrice: number;
  gasToken: string;
  refundReceiver: string;
  nonce: number;
  safeTxHash: string;
  txHash: string;
  transactionHash: string;
}
```

### `PrepaidCard.split` (TBD)
### `PrepaidCard.transfer` (TBD)

## `RevenuePool` (TBD)
### `RevenuePool.balanceOf` (TBD)
### `RevenuePool.withdraw` (TBD)
## `RewardPool` (TBD)
### `RewardPool.balanceOf` (TBD)
### `RewardPool.withdraw` (TBD)

## `ExchangeRate`
The `ExchangeRate` API is used to get the current exchange rates in USD and ETH for the various stablecoin that we support. These rates are fed by the Chainlink price feeds for the stablecoin rates and the DIA oracle for the CARD token rates. As we onboard new stablecoin we'll add more exchange rates. The price oracles that we use reside in layer 2, so please supply a layer 2 web3 instance when instantiating an `ExchangeRate` instance.
```js
import { ExchangeRate } from "@cardstack/cardpay-sdk";
let web3 = new Web3(myProvider);
let exchangeRate = new ExchangeRate(web3); // Layer 2 web3 instance
```
### `ExchangeRate.convertToSpend`
This call will convert an amount in the specified token to a SPEND amount. This function returns a number representing the SPEND amount. The input to this function is the token amount as a string in units of `wei`.
```js
let spendAmount = await exchangeRate.convertFromSpend(daicpxdAddress, toWei(10)); // convert 10 DAI to SPEND
console.log(`SPEND value ${spendAmount}`);
```
### `ExchangeRate.convertFromSpend`
This call will convert a SPEND amount into the specified token amount, where the result is a string that represents the token in units of `wei`. Since SPEND tokens represent $0.01 USD, it is safe to represent SPEND as a number when providing the input value.
```js
let weiAmount = await exchangeRate.convertFromSpend(daicpxdAddress, 10000); // convert 10000 SPEND into DAI
console.log(`DAI value ${fromWei(weiAmount)}`);
```
### `ExchangeRate.getUSDPrice`
This call will return the USD value for the specified amount of the specified token. If we do not have an exchange rate for the token, then an exception will be thrown. This API requires that the token amount be specified in `wei` (10<sup>18</sup> `wei` = 1 token) as a string, and will return a floating point value in units of USD. You can easily convert a token value to wei by using the `Web3.utils.toWei()` function.

```js
let exchangeRate = new ExchangeRate(web3);
let usdPrice = await exchangeRate.getUSDPrice("DAI", amountInWei);
console.log(`USD value: $${usdPrice.toFixed(2)} USD`);
```
### ExchangeRate.getUSDConverter
This returns a function that converts an amount of a token in wei to USD. Similar to `ExchangeRate.getUSDPrice`, an exception will be thrown if we don't have the exchange rate for the token. The returned function accepts a string that represents an amount in wei and returns a number that represents the USD value of that amount of the token.

```js
let exchangeRate = new ExchangeRate(web3);
let converter = await exchangeRate.getUSDConverter("DAI");
console.log(`USD value: $${converter(amountInWei)} USD`);
```
### `ExchangeRate.getETHPrice`
This call will return the ETH value for the specified amount of the specified token. If we do not have an exchange rate for the token, then an exception will be thrown. This API requires that the token amount be specified in `wei` (10<sup>18</sup> `wei` = 1 token) as a string, and will return a string that represents the ETH value in units of `wei` as well. You can easily convert a token value to wei by using the `Web3.utils.toWei()` function. You can also easily convert units of `wei` back into `ethers` by using the `Web3.utils.fromWei()` function.

```js
let exchangeRate = new ExchangeRate(web3);
let ethWeiPrice = await exchangeRate.getETHPrice("CARD", amountInWei);
console.log(`ETH value: ${fromWei(ethWeiPrice)} ETH`);
```
### `ExchangeRate.getUpdatedAt`
This call will return a `Date` instance that indicates the date the token rate was last updated.

```js
let exchangeRate = new ExchangeRate(web3);
let date = await exchangeRate.getUpdatedAt("DAI");
console.log(`The ${token} rate was last updated at ${date.toString()}`);
```
## `getAddress`
`getAddress` is a utility that will retrieve the contract address for a contract that is part of the Card Protocol in the specified network. The easiest way to use this function is to just pass your web3 instance to the function, and the function will query the web3 instance to see what network it is currently using. You can also just pass in the network name.

```js
let daiCpxdToken = await getAddress("daiCpxd", web3);
let daiToken = await getAddress("daiToken", web3);
let foreignBridge = await getAddress("foreignBridge", web3);
let homeBridge = await getAddress("homeBridge", web3);
let prepaidCardManager = await getAddress("prepaidCardManager", web3);
```

## `getOracle`
`getOracle` is a utility that will retrieve the contract address for a price oracle for the specified token in the specified network. The easiest way to use this function is to just pass your web3 instance to the function, and the function will query the web3 instance to see what network it is currently using. You can also just pass in the network name. Please omit the ".CPXD" suffix in the token name that you provide.
```js
let daiOracle = await getOracle("DAI", web3);
let cardOracle = await getOracle("CARD", web3);
```

## `getConstant`
`getConstant` is a utility that will retrieve a network sensitive constant. The easiest way to use this function is to just pass your web3 instance to the function, and the function will query the web3 instance to see what network it is currently using. You can also just pass in the network name.

```js
let blockExplorer = await getConstant("blockExplorer", web3);
let rpcNode = await getConstant("rpcNode", "sokol");
let relayServiceURL = await getConstant("relayServiceURL", web3);
let transactionServiceURL = await getConstant("transactionServiceURL", web3);
```
## `networkIds`
`networkIds` is a POJO that maps a network name to it's ethereum network ID.
```js
let networkId = networkIds["sokol"]; // 77
```
Also, `networks` is an inverted `networkIds` POJO if you need to go in the other direction.
```js
let networkName = networks[77]; // "sokol"
```

## ABI's
All of the ABI's for the contracts that participate in the Card Protocol are also available:
```js
import {
  ERC20ABI,
  ERC677ABI,
  ForeignBridgeMediatorABI,
  HomeBridgeMediatorABI,
  PrepaidCardManagerABI } from "@cardstack/cardpay-sdk";
```