import Web3 from 'web3';
import { networkName } from '../sdk/utils/general-utils';

const addresses: {
  [network: string]: {
    [contractName: string]: string | { [tokenName: string]: string };
  };
} = Object.freeze({
  kovan: {
    cardToken: '0xd6E34821F508e4247Db359CFceE0cb5e8050972a',
    daiToken: '0x4F96Fe3b7A6Cf9725f59d353F723c1bDb64CA6Aa',
    foreignBridge: '0x366b4cc64D30849568af65522De3a68ea6CC78cE',
  },
  sokol: {
    homeBridge: '0x16a80598DD2f143CFBf091638CE3fB02c9135528',
    daiCpxd: '0xFeDc0c803390bbdA5C4C296776f4b574eC4F30D1',
    cardCpxd: '0xB236ca8DbAB0644ffCD32518eBF4924ba866f7Ee',
    prepaidCardManager: '0x8b0625288cb14F29ED0519F1d281956D46e10ce0',
    revenuePool: '0x5D11326E20C01C5bc62544e3E31F101ED6aDCBBd',
    bridgeUtils: '0x3498110baDFa94e26a58eFe3D834D1308e32f240',
    spend: '0x51383885587B46859a5F58b71Da9CEd7d6e947E5',
    oracles: {
      DAI: '0x8A469E82142dE001Ac51eF6BC6F7633eD0E9EfF0', // eslint-disable-line @typescript-eslint/naming-convention
      CARD: '0xAf2eEaF3690C1b5C9145e33408De487727cF251E', // eslint-disable-line @typescript-eslint/naming-convention
    },
  },
  mainnet: {
    cardToken: '0x954b890704693af242613edEf1B603825afcD708',
    daiToken: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  },
  xdai: {},
});

export default addresses;

export function getAddressByNetwork(contractName: string, network: string): string {
  let address = addresses[network][contractName];
  if (!address) {
    throw new Error(`Don't know about the address for '${contractName}' for network ${network}`);
  }
  if (typeof address !== 'string') {
    throw new Error(`'${contractName}' is actually a group oracles. use getOracle() to get an oracle`);
  }
  return address;
}

export async function getAddress(contractName: string, web3: Web3): Promise<string> {
  let network = await networkName(web3);
  return getAddressByNetwork(contractName, network);
}

export function getOracleByNetwork(tokenName: string, network: string): string {
  let oracles = addresses[network].oracles;
  if (!oracles) {
    throw new Error(`No oracles have been defined for the network ${network}`);
  }
  if (typeof oracles === 'string') {
    throw new Error(`the addresses entry "oracles" must be a group of oracles for network ${network}`);
  }
  let address = oracles[tokenName];
  if (!address) {
    throw new Error(`No oracle exists for the token '${tokenName}' for the network ${network}`);
  }
  return address;
}

export async function getOracle(tokenName: string, web3: Web3): Promise<string> {
  let network = await networkName(web3);
  return getOracleByNetwork(tokenName, network);
}
