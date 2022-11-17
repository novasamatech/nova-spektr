import compact from 'lodash/compact';
import sortBy from 'lodash/sortBy';
import { BN, BN_TWO, bnMin } from '@polkadot/util';
import { ApiPromise } from '@polkadot/api';

import { Chain } from '@renderer/domain/chain';
import chainsDev from './common/chains/chains.json';
import chainsOmniProd from './common/chains/omni-chains.json';
import chainsOmniDev from './common/chains/omni-chains_dev.json';
import { ChainLike, IChainService } from './common/types';
import { isKusama, isPolkadot, isTestnet } from './common/utils';
import { DEFAULT_TIME, ONE_DAY, THRESHOLD } from './common/constants';

const CHAINS: Record<string, any> = {
  dev: chainsDev,
  'omni-dev': chainsOmniDev,
  'omni-prod': chainsOmniProd,
};

export function useChains(): IChainService {
  const getChainsData = (): Promise<Chain[]> => Promise.resolve(CHAINS[process.env.CHAINS_FILE || 'dev']);

  const sortChains = <T extends ChainLike>(chains: T[]): T[] => {
    let polkadot;
    let kusama;
    const testnets = [] as T[];
    const parachains = [] as T[];

    chains.forEach((chain) => {
      if (isPolkadot(chain.name)) polkadot = chain;
      else if (isKusama(chain.name)) kusama = chain;
      else if (isTestnet(chain.options)) testnets.push(chain);
      else parachains.push(chain);
    });

    return compact([polkadot, kusama, ...sortBy(parachains, 'name'), ...sortBy(testnets, 'name')]) as T[];
  };

  const getExpectedBlockTime = (api: ApiPromise): BN => {
    return bnMin(
      ONE_DAY,
      // Babe, e.g. Relay chains (Substrate defaults)
      api.consts.babe?.expectedBlockTime ||
        // POW, eg. Kulupu
        api.consts.difficulty?.targetBlockTime ||
        // Subspace
        api.consts.subspace?.expectedBlockTime ||
        // Check against threshold to determine value validity
        (api.consts.timestamp?.minimumPeriod.gte(THRESHOLD)
          ? // Default minimum period config
            api.consts.timestamp.minimumPeriod.mul(BN_TWO)
          : api.query.parachainSystem
          ? // default guess for a parachain
            DEFAULT_TIME.mul(BN_TWO)
          : // default guess for others
            DEFAULT_TIME),
    );
  };

  return {
    getChainsData,
    sortChains,
    getExpectedBlockTime,
  };
}
