import compact from 'lodash/compact';
import sortBy from 'lodash/sortBy';

import chains from './common/chains/chains.json';
import { IChainService } from './common/types';
import { Chain } from '@renderer/domain/chain';
import { isKusama, isPolkadot, isTestnet } from './common/utils';

export function useChains(): IChainService {
  const getChainsData = (): Promise<Chain[]> => Promise.resolve(chains as unknown as Chain[]);

  const sortChains = <T extends Chain = Chain>(chains: T[]): T[] => {
    let polkadot;
    let kusama;
    const testnets = [] as T[];
    const parachains = [] as T[];

    chains.forEach((chain) => {
      if (isPolkadot(chain)) polkadot = chain;
      else if (isKusama(chain)) kusama = chain;
      else if (isTestnet(chain)) testnets.push(chain);
      else parachains.push(chain);
    });

    return compact([polkadot, kusama, ...sortBy(parachains, 'name'), ...sortBy(testnets, 'name')]) as T[];
  };

  return {
    getChainsData,
    sortChains,
  };
}
