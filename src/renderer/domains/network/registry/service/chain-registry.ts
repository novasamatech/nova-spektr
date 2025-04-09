import { type PolkadotClient } from 'polkadot-api';
import { type JsonRpcProvider } from 'polkadot-api/ws-provider/web';

import { chainsService } from '@/shared/api/network';
import { type Chain, type ChainId } from '@/shared/core';
import { dictionary, nullable } from '@/shared/lib/utils';

// HINT: Work in progress
class ChainRegistry {
  readonly #providers: Map<ChainId, JsonRpcProvider> = new Map();
  readonly #clients: Map<ChainId, PolkadotClient> = new Map();

  readonly #chainsList: Chain[];
  readonly #chainsMap: Record<ChainId, Chain>;

  constructor(chains: Chain[]) {
    this.#chainsList = chains;
    this.#chainsMap = dictionary(chains, 'chainId');
  }

  // getApi<D extends ChainDefinition>(chainId: ChainId): TypedApi<D> {
  //   const client = this.#clients.get(chainId);
  //
  //   if (nullable(client)) {
  //     console.warn(`Chain ${chainId} is not connected`);
  //   }
  //
  //   return createClient(getWsProvider(''));
  // }

  connect(chainId: ChainId) {
    const provider = this.#providers.get(chainId);

    if (nullable(provider)) {
      console.warn(`Provider ${chainId} is not found`);
    } else {
      // connect
    }
  }

  disconnect(chainId: ChainId) {
    const provider = this.#providers.get(chainId);
    const client = this.#clients.get(chainId);

    if (nullable(provider) || nullable(client)) {
      console.warn(`Chain ${chainId} is not connected`);
    } else {
      client.destroy();
      this.#clients.delete(chainId);
      this.#providers.delete(chainId);
    }
  }

  get chainsMap() {
    return this.#chainsMap;
  }

  get chainsList() {
    return this.#chainsList;
  }

  getChain(chainId: ChainId): Chain | null {
    return this.#chainsMap[chainId] ?? null;
  }
}

export const Registry = new ChainRegistry(chainsService.getChainsData());
