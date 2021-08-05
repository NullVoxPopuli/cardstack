import detectEthereumProvider from '@metamask/detect-provider';
import WalletConnectProvider from '../wc-provider';
import WalletConnectQRCodeModal from '@walletconnect/qrcode-modal';
import config from '../../config/environment';
import CustomStorageWalletConnect, {
  clearWalletConnectStorage,
} from '../wc-connector';
import { Emitter, SimpleEmitter } from '../events';
import { WalletProviderId } from '../wallet-providers';
import { action } from '@ember/object';
import { getConstantByNetwork, networkIds } from '@cardstack/cardpay-sdk';
import { NetworkSymbol } from './types';

const GET_PROVIDER_STORAGE_KEY = (chainId: number) =>
  `cardstack-chain-${chainId}-provider`;
const WALLET_CONNECT_BRIDGE = 'https://safe-walletconnect.gnosis.io/';
interface ConnectionManagerOptions {
  chainId: number;
  networkSymbol: NetworkSymbol;
}

type ConnectionManagerWalletEvent =
  | 'connected'
  | 'disconnected'
  | 'chain-changed';

type ConnectionManagerCrossTabEvent = 'cross-tab-connection';

export type ConnectionManagerEvent =
  | ConnectionManagerWalletEvent
  | ConnectionManagerCrossTabEvent;

const BROADCAST_CHANNEL_MESSAGES = {
  DISCONNECTED: 'DISCONNECTED',
  CONNECTED: 'CONNECTED',
} as const;

/**
 * # ConnectionManager
 * This class simplifies the interface to communicate with wallet providers (MetaMask or WalletConnect).
 *
 * Calling setup with a valid provider id and optionally a session will set up a provider and bind
 * event handlers for connection, disconnection, and chain change events.
 *
 * - connected: A wallet is connected, or the address is changed
 * - disconnected: A wallet is disconnected
 * - chain-changed: A wallet's chain is updated or detected for the first time
 *
 * It also handles cross-tab communication and persistence of connection information across refreshes.
 * Cross-tab disconnection is handled internally while cross-tab connection is handled by emitting the event
 * to this class' consumer (layer 1 chain), which needs to set up a web3 instance first so that the event handlers
 * it has can work correctly as they use the web3 instance.
 *
 * This class does not, at the moment, store any state used directly by the UI besides providerId.
 */
export class ConnectionManager {
  private strategy: ConnectionStrategy | undefined;
  private broadcastChannel: BroadcastChannel | undefined;
  chainId: number;
  networkSymbol: NetworkSymbol;
  simpleEmitter = new SimpleEmitter();

  constructor(networkSymbol: NetworkSymbol) {
    this.networkSymbol = networkSymbol;
    this.chainId = networkIds[networkSymbol];

    // we want to ensure that users don't get confused by different tabs having
    // different wallets connected so we communicate disconnections across tabs
    this.broadcastChannel = new BroadcastChannel(
      `cardstack-layer-1-connection-sync`
    );
    this.broadcastChannel.addEventListener(
      'message',
      this.onBroadcastChannelMessage
    );
  }

  static getProviderIdForChain(chainId: number) {
    return window.localStorage.getItem(GET_PROVIDER_STORAGE_KEY(chainId));
  }

  static removeProviderFromStorage(chainId: number) {
    window.localStorage.removeItem(GET_PROVIDER_STORAGE_KEY(chainId));
  }

  static addProviderToStorage(chainId: number, providerId: WalletProviderId) {
    window.localStorage.setItem(GET_PROVIDER_STORAGE_KEY(chainId), providerId);
  }

  get provider() {
    return this.strategy?.provider;
  }

  get providerId() {
    return this.strategy?.providerId;
  }

  createStrategy(providerId: WalletProviderId) {
    if (providerId === 'metamask') {
      return new MetaMaskConnectionStrategy({
        chainId: this.chainId,
        networkSymbol: this.networkSymbol,
      });
    } else if (providerId === 'wallet-connect') {
      return new WalletConnectConnectionStrategy({
        chainId: this.chainId,
        networkSymbol: this.networkSymbol,
      });
    } else {
      throw new Error(`Unrecognised id for connection manager: ${providerId}`);
    }
  }

  reset() {
    this.strategy?.destroy();
    this.strategy = undefined;
  }

  async setup(providerId: WalletProviderId, session?: any) {
    this.strategy = this.createStrategy(providerId);
    this.strategy.on('connected', this.onConnect);
    this.strategy.on('disconnected', this.onDisconnect);
    this.strategy.on('chain-changed', this.onChainChanged);
    await this.strategy?.setup(session);
  }

  async connect() {
    await this.strategy?.connect();
  }

  async reconnect() {
    await this.strategy?.reconnect();
  }

  disconnect() {
    this.strategy?.disconnect();
  }

  on(event: ConnectionManagerEvent, cb: Function) {
    return this.simpleEmitter.on(event, cb);
  }

  emit(event: ConnectionManagerEvent, ...args: any[]) {
    return this.simpleEmitter.emit(event, ...args);
  }

  @action
  onBroadcastChannelMessage(event: MessageEvent) {
    if (event.data.type === BROADCAST_CHANNEL_MESSAGES.DISCONNECTED) {
      this.onDisconnect(false);
    } else if (
      event.data.type === BROADCAST_CHANNEL_MESSAGES.CONNECTED &&
      !this.strategy
    ) {
      this.emit('cross-tab-connection', event.data);
    }
  }

  @action onDisconnect(broadcast: boolean) {
    if (!this.strategy) return;
    ConnectionManager.removeProviderFromStorage(this.chainId);
    this.emit('disconnected');
    if (broadcast)
      this.broadcastChannel?.postMessage({
        type: BROADCAST_CHANNEL_MESSAGES.DISCONNECTED,
      });
  }

  @action onConnect(accounts: string[]) {
    if (!this.strategy) return;
    ConnectionManager.addProviderToStorage(
      this.chainId,
      this.strategy.providerId
    );
    this.emit('connected', accounts);
    this.broadcastChannel?.postMessage({
      type: BROADCAST_CHANNEL_MESSAGES.CONNECTED,
      providerId: this.providerId,
      session: this.strategy.getSession(),
    });
  }

  @action onChainChanged(chainId: number) {
    this.emit('chain-changed', chainId);
  }
}

abstract class ConnectionStrategy
  implements Emitter<ConnectionManagerWalletEvent> {
  private simpleEmitter: SimpleEmitter;

  // concrete classes will need to implement these
  abstract providerId: WalletProviderId;
  abstract setup(session?: any): Promise<any>;
  abstract reconnect(): Promise<void>;
  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;

  // concrete classes may optionally implement these methods
  getSession() {}
  destroy() {}

  // networkSymbol and chainId are initialized in the constructor
  networkSymbol: NetworkSymbol;
  chainId: number;

  // this is initialized in the `setup` method of concrete classes
  provider: any;

  constructor(options: ConnectionManagerOptions) {
    this.chainId = options.chainId;
    this.networkSymbol = options.networkSymbol;
    this.simpleEmitter = new SimpleEmitter();
  }

  on(event: ConnectionManagerWalletEvent, cb: Function) {
    return this.simpleEmitter.on(event, cb);
  }

  emit(event: ConnectionManagerWalletEvent, ...args: any[]) {
    return this.simpleEmitter.emit(event, ...args);
  }

  onDisconnect(broadcast = true) {
    this.emit('disconnected', broadcast);
  }

  onConnect(accounts: string[]) {
    this.emit('connected', accounts);
  }

  onChainChanged(chainId: number) {
    this.emit('chain-changed', chainId);
  }
}

class MetaMaskConnectionStrategy extends ConnectionStrategy {
  providerId = 'metamask' as WalletProviderId;

  async setup() {
    let provider: any | undefined = await detectEthereumProvider();

    if (!provider) {
      // TODO: some UI prompt for getting people to setup metamask
      console.log('Please install MetaMask!');
      return;
    }

    if (provider !== window.ethereum) {
      // TODO: some UI prompt to get people to disconnect their other wallets
      console.error('Do you have multiple wallets installed?');
      return;
    }

    provider.on('accountsChanged', (accounts: string[]) => {
      if (!accounts.length) {
        this.onDisconnect();
      } else {
        this.onConnect(accounts);
      }
    });

    // Subscribe to chainId change
    provider.on('chainChanged', (changedChainId: string) => {
      this.onChainChanged(parseInt(changedChainId));
    });

    // Note that this is, following EIP-1193, about connection of the wallet to the
    // chain, not our dapp to the wallet
    provider.on('disconnect', (error: { code: number; message: string }) => {
      console.error(error);
      this.onDisconnect();
    });

    this.provider = provider;
  }

  async connect() {
    if (!this.provider)
      throw new Error('Trying to connect before provider is set');
    let accounts = await this.provider.request({
      method: 'eth_accounts',
    });
    if (accounts.length) {
      // so we had accounts before, let's just connect to them now
      // metamask's disconnection is a faux-disconnection - the wallet still thinks
      // it is connected to the account so it will not fire the connection/account change events
      this.onConnect(accounts);
    } else {
      // otherwise we want to trigger the extension prompt
      await this.provider.request({
        method: 'eth_requestAccounts',
      });
    }

    let chainId = parseInt(
      await this.provider.request({
        method: 'eth_chainId',
      })
    );

    this.onChainChanged(chainId);
  }

  // metamask actually doesn't allow you to disconnect via its API
  // all we do here is fire the disconnect callback
  async disconnect() {
    this.onDisconnect();
    return;
  }

  // unlike the connect method, here we do not try to open the popup (eth_requestAccounts) if there is no account
  async reconnect() {
    let accounts = await this.provider.request({ method: 'eth_accounts' });
    if (accounts.length) {
      // metamask's disconnection is a faux-disconnection - the wallet still thinks
      // it is connected to the account so it will not fire the connection/account change events
      this.onConnect(accounts);

      let chainId = parseInt(
        await this.provider.request({
          method: 'eth_chainId',
        })
      );

      this.onChainChanged(chainId);
    } else {
      // if we didn't find accounts, then the stored provider key is not useful, delete it
      ConnectionManager.removeProviderFromStorage(this.chainId);
    }
  }

  // eslint-disable-next-line ember/classic-decorator-hooks
  destroy() {
    super.destroy();
    // remove all listeners that previous instances of metamask connections have added
    // otherwise disconnecting and reconnecting might cause "duplicate" event listeners
    this.provider?.removeAllListeners();
  }
}

class WalletConnectConnectionStrategy extends ConnectionStrategy {
  providerId = 'wallet-connect' as WalletProviderId;

  getSession() {
    return this.provider.connector.session;
  }

  async setup(session?: any) {
    let { chainId } = this;
    // in case we've disconnected, we should clear wallet connect's local storage data as well
    // As per https://github.com/WalletConnect/walletconnect-monorepo/issues/258 there is no way
    // for us to tell if this is valid before we connect, but we don't want to connect to something
    // if we have disconnected from it in the first place (since we cleared our local storage identification of provider)
    if (ConnectionManager.getProviderIdForChain(chainId) !== this.providerId) {
      clearWalletConnectStorage(chainId);
    }

    let connectorOptions;
    if (session) {
      connectorOptions = { session };
    } else {
      connectorOptions = {
        bridge: WALLET_CONNECT_BRIDGE,
        qrcodeModal: WalletConnectQRCodeModal,
      };
    }
    let provider = new WalletConnectProvider({
      chainId,
      infuraId: config.infuraId,
      rpc: {
        [networkIds[this.networkSymbol]]: getConstantByNetwork(
          'rpcNode',
          this.networkSymbol
        ),
      },
      rpcWss: {
        [networkIds[this.networkSymbol]]: getConstantByNetwork(
          'rpcWssNode',
          this.networkSymbol
        ),
      },
      // based on https://github.com/WalletConnect/walletconnect-monorepo/blob/7aa9a7213e15489fa939e2e020c7102c63efd9c4/packages/providers/web3-provider/src/index.ts#L47-L52
      connector: new CustomStorageWalletConnect(connectorOptions, chainId),
    });

    // Subscribe to accounts change
    provider.on('accountsChanged', (accounts: string[]) => {
      if (accounts.length) this.onConnect(accounts);
    });

    // Subscribe to chainId change
    provider.on('chainChanged', (changedChainId: number) => {
      this.onChainChanged(changedChainId);
    });

    // Subscribe to session disconnection
    // This is how WalletConnect informs us if we disconnect the Dapp
    // from the wallet side. Unlike MetaMask, listening to 'accountsChanged'
    // does not work.
    provider.on('disconnect', (code: number, reason: string) => {
      console.log('disconnect from wallet connect', code, reason);
      this.onDisconnect(false);
    });

    this.provider = provider;
    return;
  }

  async connect() {
    return await this.provider.enable();
  }

  async disconnect() {
    return await this.provider.disconnect();
  }

  async reconnect() {
    // if the qr code modal ever pops up when the application is loading, it's time to revisit this code
    // this typically should not open the modal if CustomStorageWalletConnect is initialized with a
    // valid session from localStorage
    return await this.provider.enable();
  }
}
