import mitt, { type Emitter } from 'mitt';
import { type CompatibilityToken, type PolkadotClient, createClient } from 'polkadot-api';
import {
  type JsonRpcProvider,
  type WsEvent,
  type WsJsonRpcProvider,
  type WsProviderConfig,
  getWsProvider,
} from 'polkadot-api/ws-provider/web';

import { chainsService } from '@/shared/api/network';
import { type Chain, type ChainId } from '@/shared/core';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { CONFIG } from '../lib/constants';

type RegistryEvents = {
  status: {
    chainId: ChainId;
    type: WsEvent;
  };
};

export class ChainRegistry {
  // TODO: support Light Clients in future
  readonly #storage = new Map<
    ChainId,
    {
      provider: WsJsonRpcProvider;
      client: PolkadotClient;
    }
  >();
  readonly #tokens = new Map<ChainId, CompatibilityToken>();
  readonly #subscribers = new Map<ChainId, VoidFunction[]>();

  readonly #chainsList: Chain[];
  readonly #chainsMap: Map<ChainId, Chain>;

  readonly #events: Emitter<RegistryEvents> = mitt();

  readonly #createWcProvider: (wsProviderConfig: WsProviderConfig) => WsJsonRpcProvider;
  readonly #createClient: (provider: JsonRpcProvider) => PolkadotClient;

  constructor(
    chains: Chain[],
    papi: {
      createWcProvider: (wsProviderConfig: WsProviderConfig) => WsJsonRpcProvider;
      createClient: (provider: JsonRpcProvider) => PolkadotClient;
    },
  ) {
    this.#chainsList = chains;
    this.#chainsMap = new Map(chains.map(c => [c.chainId, c]));
    this.#createWcProvider = papi.createWcProvider;
    this.#createClient = papi.createClient;
  }

  getApi(chainId: ChainId) {
    const connector = this.#storage.get(chainId);

    if (nullable(connector)) {
      throw new Error(`Provider and Client for ${chainId} is absent, need to establish connect first`);
    }

    const chain = this.#chainsMap.get(chainId);
    if (nullable(chain)) {
      throw new Error(`Chain ${chainId} is not supported`);
    }

    const config = CONFIG[chain.specName];
    if (nullable(config)) {
      throw new Error(`Chain spec ${chain.specName} is not supported`);
    }

    return config(chain.chainId, connector.client);
  }

  connect(chainId: ChainId, endpoints: string[]) {
    if (this.#storage.has(chainId)) {
      throw new Error(`Connection for ${chainId} already exists`);
    }

    const provider = this.#createWcProvider({
      endpoints,
      onStatusChanged: ({ type }) => this.#events.emit('status', { chainId, type }),
    });

    this.#storage.set(chainId, { provider, client: this.#createClient(provider) });
  }

  async requestToken(chainId: ChainId) {
    if (this.#tokens.has(chainId)) {
      throw new Error(`Token for ${chainId} already exists`);
    }

    this.#tokens.set(chainId, await this.getApi(chainId).api.compatibilityToken);
  }

  disconnect(chainId: ChainId) {
    const connector = this.#storage.get(chainId);

    if (nullable(connector)) {
      throw new Error(`Provider for ${chainId} is not connected`);
    }

    connector.client.destroy();

    this.#storage.delete(chainId);
    this.#subscribers.delete(chainId);
    this.#tokens.delete(chainId);
  }

  getCompatibilityToken(chainId: ChainId) {
    const token = this.#tokens.get(chainId);

    if (nullable(token)) {
      throw new Error(`Token for ${chainId} is absent. Request it after connection.`);
    }

    return token;
  }

  on<K extends keyof RegistryEvents>(chainId: ChainId, key: K, cb: (value: RegistryEvents[K]) => void) {
    this.#events.on(key, cb);
    const unsub = () => this.#events.off(key, cb);

    const subscriber = this.#subscribers.get(chainId);

    if (nullable(subscriber)) {
      this.#subscribers.set(chainId, [unsub]);
    } else {
      subscriber.push(unsub);
    }
  }

  off<K extends keyof RegistryEvents>(chainId: ChainId, key: K, listener: VoidFunction) {
    const subscriber = this.#subscribers.get(chainId);

    if (nullable(subscriber)) {
      throw new Error("Doesn't contain this event listener");
    }

    this.#events.off(key, listener);
    subscriber.filter(fn => fn !== listener);
  }

  get chainsMap() {
    return this.#chainsMap;
  }

  get chainsList() {
    return this.#chainsList;
  }

  getChain(chainId: ChainId) {
    return this.#chainsMap.get(chainId);
  }

  getFinalizedBlock(chainId: ChainId) {
    const connector = this.#storage.get(chainId);

    if (nullable(connector)) {
      throw new Error(`Provider for ${chainId} is not connected`);
    }

    return connector.client.getFinalizedBlock();
  }
}

// Singleton instance
let instance: ChainRegistry | undefined;

export async function getChainRegistry(): Promise<ChainRegistry> {
  if (nullable(instance)) {
    const chains = await chainsService.getChainsData();
    const sortedChains = nonNullable(chains) ? chainsService.sortChains(chains) : [];
    instance = new ChainRegistry(sortedChains, {
      createWcProvider: getWsProvider,
      createClient,
    });
  }

  return instance;
}
