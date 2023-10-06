import sortBy from 'lodash/sortBy';
import concat from 'lodash/concat';
import keyBy from 'lodash/keyBy';
import orderBy from 'lodash/orderBy';

import chainsProd from '@renderer/assets/chains/chains.json';
import chainsDev from '@renderer/assets/chains/chains_dev.json';
import { getRelaychainAsset, nonNullable, totalAmount, ZERO_BALANCE } from '@renderer/shared/lib/utils';
import { ChainLike } from './common/types';
import { isKusama, isPolkadot, isTestnet, isNameWithNumber } from './common/utils';
import type { Chain, ChainId, Balance } from '@renderer/shared/core';

const CHAINS: Record<string, any> = {
  chains: chainsProd,
  'chains-dev': chainsDev,
};

export const chainsService = {
  getChainsData,
  getChainById,
  getStakingChainsData,
  sortChains,
  sortChainsByBalance,
};

function getChainsData(): Chain[] {
  return CHAINS[process.env.CHAINS_FILE || 'chains'];
}

function getChainById(chainId: ChainId): Chain | undefined {
  const chainsData: Chain[] = CHAINS[process.env.CHAINS_FILE || 'chains'];

  return chainsData.find((chain) => chain.chainId === chainId);
}

function getStakingChainsData(): Chain[] {
  const chainsData: Chain[] = CHAINS[process.env.CHAINS_FILE || 'chains'];

  return chainsData.reduce<Chain[]>((acc, chain) => {
    if (getRelaychainAsset(chain.assets)) {
      acc.push(chain);
    }

    return acc;
  }, []);
}

function sortChains<T extends ChainLike>(chains: T[]): T[] {
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
}

function sortChainsByBalance(chains: Chain[], balances: Balance[]): Chain[] {
  const relaychains = { withBalance: [], noBalance: [] };
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
      collection = hasBalance ? relaychains.withBalance : relaychains.noBalance;
    } else if (isTestnet(chain.options)) {
      collection = hasBalance ? testnets.withBalance : testnets.noBalance;
    } else if (isNameWithNumber(chain.name)) {
      collection = hasBalance ? numberchains.withBalance : numberchains.noBalance;
    }

    collection.push(chain);
  });

  return concat(
    orderBy(relaychains.withBalance, 'name', ['desc']),
    orderBy(relaychains.noBalance, 'name', ['desc']),
    sortBy(parachains.withBalance, 'name'),
    sortBy(parachains.noBalance, 'name'),
    sortBy(numberchains.withBalance, 'name'),
    sortBy(numberchains.noBalance, 'name'),
    sortBy(testnets.withBalance, 'name'),
    sortBy(testnets.noBalance, 'name'),
  );
}
