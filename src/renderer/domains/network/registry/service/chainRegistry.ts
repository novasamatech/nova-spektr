import { type PolkadotClient, createClient } from 'polkadot-api';
import { WsEvent, type WsJsonRpcProvider, getWsProvider } from 'polkadot-api/ws-provider/web';

import { chainsService } from '@/shared/api/network';
import { type Chain, type ChainId } from '@/shared/core';
import { nullable } from '@/shared/lib/utils';
import { CONFIG } from '../lib/constants';
import { type ChainApi } from '../lib/types';

class ChainRegistry {
  static #instance: ChainRegistry;

  // TODO: support Light Clients in future
  #storage: Map<
    ChainId,
    {
      provider: WsJsonRpcProvider;
      client: PolkadotClient;
    }
  > = new Map();

  #chainsList: Chain[];
  #chainsMap: Map<ChainId, Chain>;

  constructor(chains: Chain[]) {
    this.#chainsList = chains;
    this.#chainsMap = new Map(chains.map(c => [c.chainId, c]));
  }

  static init(chains: Chain[]) {
    if (!ChainRegistry.#instance) {
      ChainRegistry.#instance = new ChainRegistry(chains);
    }

    return ChainRegistry.#instance;
  }

  getApi(chainId: ChainId): ChainApi {
    const connector = this.#storage.get(chainId);

    if (nullable(connector)) {
      throw new Error(`Provider and Client for ${chainId} is absent, need to establish connect first`);
    }

    if (nullable(CONFIG[chainId])) {
      throw new Error(`Chain ${chainId} is not supported`);
    }

    return CONFIG[chainId](connector.client);
  }

  connect(
    chainId: ChainId,
    endpoints: string[],
    handlers?: {
      connecting: VoidFunction;
      connected: VoidFunction;
      error: VoidFunction;
      closed: VoidFunction;
    },
  ) {
    if (this.#storage.has(chainId)) {
      throw new Error(`Provider for ${chainId} already exist, use switch to change rpc node`);
    }

    const provider = getWsProvider({
      endpoints,
      onStatusChanged: status => {
        if (nullable(handlers)) return;

        const fn = {
          [WsEvent.CONNECTING]: handlers.connecting,
          [WsEvent.CONNECTED]: handlers.connected,
          [WsEvent.ERROR]: handlers.error,
          [WsEvent.CLOSE]: handlers.closed,
        };

        fn[status.type]();
      },
    });

    this.#storage.set(chainId, { provider, client: createClient(provider) });
  }

  // switch(chainId: ChainId, endpoints: string[]) {
  //   if (!this.#providers.has(chainId)) {
  //     throw new Error(`Provider for ${chainId} does not exist, use connect first`);
  //   }
  //
  //   if (!this.#providers.has(chainId)) {
  //     throw new Error(`Provider for ${chainId} does not exist, use connect first`);
  //   }
  // }

  disconnect(chainId: ChainId) {
    const connector = this.#storage.get(chainId);

    if (nullable(connector)) {
      throw new Error(`Provider for ${chainId} is not connected`);
    }

    connector.client.destroy();
    this.#storage.delete(chainId);
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
}

export function getChainRegistry(): ChainRegistry {
  return ChainRegistry.init(chainsService.getChainsData());
}
