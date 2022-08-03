import { sortBy } from 'lodash';

import { Chain, IChainService } from './common/types';
import chains from './common/chains.json';
import { notNull } from '@renderer/utils/objects';

export function useChains(): IChainService {
  return {
    getChainsData: () => Promise.resolve(chains as unknown as Chain[]),
    sortChains: (chains: Chain[]): Chain[] => {
      const polkadot = chains.find((chain) => chain.name === 'Polkadot');
      if (polkadot) {
        chains.splice(chains.indexOf(polkadot), 1);
      }

      const kusama = chains.find((chain) => chain.name === 'Kusama');
      if (kusama) {
        chains.splice(chains.indexOf(kusama), 1);
      }

      return [polkadot, kusama, ...sortBy(chains, 'name')].filter(notNull);
    },
  };
}
