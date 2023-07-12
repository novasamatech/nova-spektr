import sortBy from 'lodash/sortBy';
import concat from 'lodash/concat';
import keyBy from 'lodash/keyBy';
import orderBy from 'lodash/orderBy';

import { Chain } from '@renderer/domain/chain';
import chainsProd from './common/chains/chains.json';
import chainsDev from './common/chains/chains_dev.json';
import { ChainId } from '@renderer/domain/shared-kernel';
import { getRelaychainAsset } from '@renderer/shared/utils/assets';
import { nonNullable } from '@renderer/shared/utils/functions';
import { Balance } from '@renderer/domain/balance';
import { totalAmount } from '@renderer/shared/utils/balance';
import { ZERO_BALANCE } from '@renderer/shared/utils/constants';
import { ChainLike, IChainService } from './common/types';
import { isKusama, isPolkadot, isTestnet, isNameWithNumber } from './common/utils';

const CHAINS: Record<string, any> = {
  chains: chainsProd,
  'chains-dev': chainsDev,
};

export function useChains(): IChainService {
  const getChainsData = (): Promise<Chain[]> => {
    return Promise.resolve(CHAINS[process.env.CHAINS_FILE || 'chains']);
  };

  const getChainById = (chainId: ChainId): Promise<Chain | undefined> => {
    const chainsData: Chain[] = CHAINS[process.env.CHAINS_FILE || 'chains'];
    const chainMatch = chainsData.find((chain) => chain.chainId === chainId);

    return Promise.resolve(chainMatch);
  };

  const getStakingChainsData = (): Promise<Chain[]> => {
    const chainsData: Chain[] = CHAINS[process.env.CHAINS_FILE || 'chains'];

    const stakingChains = chainsData.reduce<Chain[]>((acc, chain) => {
      if (getRelaychainAsset(chain.assets)) {
        acc.push(chain);
      }

      return acc;
    }, []);

    return Promise.resolve(stakingChains);
  };

  const sortChains = <T extends ChainLike>(chains: T[]): T[] => {
    let polkadot;
    let kusama;
    const testnets = [] as T[];
    const parachains = [] as T[];
    const numberchains = [] as T[];

    chains.forEach((chain) => {
      if (isPolkadot(chain.name)) polkadot = chain;
      else if (isKusama(chain.name)) kusama = chain;
      else if (isTestnet(chain.options)) testnets.push(chain);
      else if (isNameWithNumber(chain.name)) numberchains.push(chain);
      else parachains.push(chain);
    });

    return concat(
      [polkadot, kusama].filter(nonNullable),
      sortBy(parachains, 'name'),
      sortBy(numberchains, 'name'),
      sortBy(testnets, 'name'),
    );
  };

  const sortChainsByBalance = (chains: Chain[], balances: Balance[]): Chain[] => {
    const dotsama = { withBalance: [], noBalance: [] };
    const parachains = { withBalance: [], noBalance: [] };
    const numberchains = { withBalance: [], noBalance: [] };
    const testnets = { withBalance: [], noBalance: [] };

    const balancesMap = keyBy(balances, (b) => `${b.chainId}_${b.assetId}`);

    chains.forEach((chain) => {
      const hasBalance = chain.assets.some((a) => {
        return totalAmount(balancesMap[`${chain.chainId}_${a.assetId}`]) !== ZERO_BALANCE;
      });

      let collection: Chain[] = hasBalance ? parachains.withBalance : parachains.noBalance;

      if (isPolkadot(chain.name) || isKusama(chain.name)) {
        collection = hasBalance ? dotsama.withBalance : dotsama.noBalance;
      } else if (isTestnet(chain.options)) {
        collection = hasBalance ? testnets.withBalance : testnets.noBalance;
      } else if (isNameWithNumber(chain.name)) {
        collection = hasBalance ? numberchains.withBalance : numberchains.noBalance;
      }

      collection.push(chain);
    });

    return concat(
      orderBy(dotsama.withBalance, 'name', ['desc']),
      orderBy(dotsama.noBalance, 'name', ['desc']),
      sortBy(parachains.withBalance, 'name'),
      sortBy(parachains.noBalance, 'name'),
      sortBy(numberchains.withBalance, 'name'),
      sortBy(numberchains.noBalance, 'name'),
      sortBy(testnets.withBalance, 'name'),
      sortBy(testnets.noBalance, 'name'),
    );
  };

  return {
    getChainsData,
    getChainById,
    getStakingChainsData,
    sortChains,
    sortChainsByBalance,
  };
}
