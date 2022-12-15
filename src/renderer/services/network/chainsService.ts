import { ApiPromise } from '@polkadot/api';
import { BN, BN_TWO, bnMin } from '@polkadot/util';
import compact from 'lodash/compact';
import sortBy from 'lodash/sortBy';

import { StakingType } from '@renderer/domain/asset';
import { Chain } from '@renderer/domain/chain';
import chainsDev from './common/chains/chains.json';
import chainsOmniProd from './common/chains/omni-chains.json';
import chainsOmniDev from './common/chains/omni-chains_dev.json';
import { DEFAULT_TIME, ONE_DAY, THRESHOLD } from './common/constants';
import { ChainLike, IChainService } from './common/types';
import { isKusama, isPolkadot, isTestnet } from './common/utils';

const CHAINS: Record<string, any> = {
  dev: chainsDev,
  'omni-dev': chainsOmniDev,
  'omni-prod': chainsOmniProd,
};

export function useChains(): IChainService {
  const getChainsData = (): Promise<Chain[]> => {
    return Promise.resolve(CHAINS[process.env.CHAINS_FILE || 'dev']);
  };

  const getStakingChainsData = (): Promise<Chain[]> => {
    const chainsData: Chain[] = CHAINS[process.env.CHAINS_FILE || 'dev'];

    const stakingChains = chainsData.reduce<Chain[]>((acc, chain) => {
      const asset = chain.assets.find((asset) => asset.staking === StakingType.RELAYCHAIN);
      if (!asset) return acc;

      return acc.concat(chain);
    }, []);

    return Promise.resolve(stakingChains);
  };

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
    const substrateBlockTime = api.consts.babe?.expectedBlockTime;
    const proofOfWorkBlockTime = api.consts.difficulty?.targetBlockTime;
    const subspaceBlockTime = api.consts.subspace?.expectedBlockTime;

    const blockTime = substrateBlockTime || proofOfWorkBlockTime || subspaceBlockTime;
    if (blockTime) {
      return bnMin(ONE_DAY, blockTime);
    }

    const thresholdCheck = api.consts.timestamp?.minimumPeriod.gte(THRESHOLD);
    if (thresholdCheck) {
      return bnMin(ONE_DAY, api.consts.timestamp.minimumPeriod.mul(BN_TWO));
    }

    // default guess for a parachain
    if (api.query.parachainSystem) {
      return bnMin(ONE_DAY, DEFAULT_TIME.mul(BN_TWO));
    }

    // default guess for others
    return bnMin(ONE_DAY, DEFAULT_TIME);
  };

  return {
    getChainsData,
    getStakingChainsData,
    sortChains,
    getExpectedBlockTime,
  };
}
