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

      return [
        polkadot,
        kusama,
        ...chains.sort((a, b) => {
          if (a.name < b.name) {
            return -1;
          }

          if (a.name > b.name) {
            return 1;
          }

          return 0;
        }),
      ].filter(notNull);
    },
  };
}
