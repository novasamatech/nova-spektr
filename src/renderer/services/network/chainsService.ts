import { sortBy } from 'lodash';

import { Chain, IChainService } from './common/types';
import chains from './common/chains.json';
import { notNull } from '@renderer/utils/objects';

export function useChains(): IChainService {
  const isPolkadot = (chain: Chain) => chain.name === 'Polkadot';
  const isKusama = (chain: Chain) => chain.name === 'Kusama';
  const isTestnet = (chain: Chain) => chain.options?.includes('testnet');

  return {
    getChainsData: () => Promise.resolve(chains as unknown as Chain[]),
    sortChains: (chains: Chain[]): Chain[] => {
      const polkadot = chains.find(isPolkadot);
      const kusama = chains.find(isKusama);
      const testnets = chains.filter(isTestnet);

      const otherChains = chains.filter((chain) => !isPolkadot(chain) && !isKusama(chain) && !isTestnet(chain));

      return [polkadot, kusama, ...sortBy(otherChains, 'name'), ...sortBy(testnets, 'name')].filter(notNull);
    },
  };
}
