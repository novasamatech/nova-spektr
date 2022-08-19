import compact from 'lodash/compact';
import sortBy from 'lodash/sortBy';

import chains from './common/chains.json';
import { Chain, IChainService } from './common/types';
import { isKusama, isPolkadot, isTestnet } from './common/utils';

export function useChains(): IChainService {
  const getChainsData = () => Promise.resolve(chains as unknown as Chain[]);

  const sortChains = (chains: Chain[]): Chain[] => {
    let polkadot;
    let kusama;
    const testnets = [] as Chain[];
    const parachains = [] as Chain[];

    chains.forEach((chain) => {
      if (isPolkadot(chain)) polkadot = chain;
      else if (isKusama(chain)) kusama = chain;
      else if (isTestnet(chain)) testnets.push(chain);
      else parachains.push(chain);
    });

    return compact([polkadot, kusama, ...sortBy(parachains, 'name'), ...sortBy(testnets, 'name')]);
  };

  return {
    getChainsData,
    sortChains,
  };
}
