import compact from 'lodash/compact';
import sortBy from 'lodash/sortBy';

import chainsDev from './common/chains/chains.json';
import chainsOmniDev from './common/chains/omni-chains_dev.json';
import chainsOmniProd from './common/chains/omni-chains.json';
import { IChainService } from './common/types';
import { Chain } from '@renderer/domain/chain';
import { isKusama, isPolkadot, isTestnet } from './common/utils';

export function useChains(): IChainService {
  const CHAINS: Record<string, any> = {
    dev: chainsDev,
    'omni-dev': chainsOmniDev,
    'omni-prod': chainsOmniProd,
  };
  const getChainsData = (): Promise<Chain[]> => Promise.resolve(CHAINS[process.env.CHAINS_FILE || 'dev']);

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
