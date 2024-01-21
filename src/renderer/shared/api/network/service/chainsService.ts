import { keyBy, orderBy, concat, sortBy } from 'lodash';
import BigNumber from 'bignumber.js';

import chainsProd from '@shared/config/chains/chains.json';
import chainsDev from '@shared/config/chains/chains_dev.json';
import { getRelaychainAsset, nonNullable, totalAmount, ZERO_BALANCE } from '@shared/lib/utils';
import type { Chain, ChainId, Balance } from '@shared/core';
import { isPolkadot, isKusama, isTestnet, isNameWithNumber } from '../lib/utils';
import { PriceObject } from '@shared/api/price-provider';
import { sumBalances } from '@pages/Assets/Assets/common/utils';

type ChainWithFiatBalance = Chain & {
  fiatBalance: string;
};

const CHAINS: Record<string, any> = {
  chains: chainsProd,
  'chains-dev': chainsDev,
};

export const chainsService = {
  getChainsData,
  getChainsMap,
  getChainById,
  getStakingChainsData,
  sortChains,
  sortChainsByBalance,
  searchChain,
};

function getChainsData(params = { sort: false }): Chain[] {
  const chains = CHAINS[process.env.CHAINS_FILE || 'chains'];

  return params.sort ? sortChains(chains) : chains;
}

function getChainsMap(params = { sort: false }): Record<ChainId, Chain> {
  return keyBy(getChainsData(params), 'chainId');
}

function getChainById(chainId: ChainId): Chain | undefined {
  return getChainsData().find((chain) => chain.chainId === chainId);
}

function searchChain(query: string): Chain | undefined {
  return getChainsData().find((chain) => chain.chainId.includes(query));
}

function getStakingChainsData(params = { sort: false }): Chain[] {
  return getChainsData(params).reduce<Chain[]>((acc, chain) => {
    if (getRelaychainAsset(chain.assets)) {
      acc.push(chain);
    }

    return acc;
  }, []);
}

function sortChains<T extends Pick<Chain, 'name' | 'options'>>(chains: T[]): T[] {
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

const compareFiatBalances = (a: ChainWithFiatBalance, b: ChainWithFiatBalance) => {
  return new BigNumber(b.fiatBalance).lt(new BigNumber(a.fiatBalance)) ? -1 : 1;
};

function sortChainsByBalance(
  chains: Chain[],
  balances: Balance[],
  assetPrices: PriceObject | null,
  currency?: string,
): Chain[] {
  const chainsWithFiatBalance = [] as ChainWithFiatBalance[];

  const relaychains = { withBalance: [], noBalance: [] };
  const parachains = { withBalance: [], noBalance: [] };
  const numberchains = { withBalance: [], noBalance: [] };
  const testnets = { withBalance: [], noBalance: [] };

  const balancesMap = balances.reduce<Record<string, Balance>>((acc, balance) => {
    const key = `${balance.chainId}_${balance.assetId}`;
    acc[key] = acc[key] ? sumBalances(acc[key], balance) : balance;

    return acc;
  }, {});

  chains.forEach((chain) => {
    const fiatBalance = chain.assets.reduce((acc, a) => {
      const amount = totalAmount(balancesMap[`${chain.chainId}_${a.assetId}`]);
      const assetPrice = a.priceId && currency && assetPrices?.[a.priceId]?.[currency]?.price;

      const BNWithConfig = BigNumber.clone();
      BNWithConfig.config({
        ROUNDING_MODE: BNWithConfig.ROUND_DOWN,
      });

      const bnPrecision = new BNWithConfig(a.precision);
      const TEN = new BNWithConfig(10);
      const bnFiatBalance = new BNWithConfig(new BigNumber(amount).multipliedBy(assetPrice || 0).toString()).div(
        TEN.pow(bnPrecision),
      );

      return acc.plus(bnFiatBalance);
    }, new BigNumber(0));

    if (fiatBalance.gt(0) && !isTestnet(chain.options)) {
      (chain as ChainWithFiatBalance).fiatBalance = fiatBalance.toString();

      chainsWithFiatBalance.push(chain as ChainWithFiatBalance);

      return;
    }

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
    chainsWithFiatBalance.sort(compareFiatBalances),
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
