import { type BN, BN_ZERO } from '@polkadot/util';
import { default as BigNumber } from 'bignumber.js';
import { concat, keyBy, orderBy, sortBy } from 'lodash';

import { type PriceObject } from '@/shared/api/price-provider';
import { type AssetBalance, type Balance, type BalanceMap, type Chain, type ChainId } from '@/shared/core';
import { CHAINS_CONFIG_URL, ZERO_BALANCE, getRelaychainAsset, nonNullable, totalAmount } from '@/shared/lib/utils';
import { isKusama, isNameStartsWithNumber, isPolkadot, isTestnet } from '../lib/utils';

type ChainWithFiatBalance = Chain & {
  fiatBalance: string;
};

export const chainsService = {
  getChainsData,
  getChainsMap,
  getStakingChainsData,
  sortChains,
  sortChainsByBalance,
};

async function getChainsData(): Promise<Chain[] | null> {
  const response = await fetch(CHAINS_CONFIG_URL);

  if (!response.ok) {
    console.error(`Failed to fetch chains config: ${response.status} ${response.statusText}`);
    return null;
  }

  return response.json();
}

function getChainsMap(chains: Chain[]): Record<ChainId, Chain> {
  return keyBy(chains, 'chainId');
}

function getStakingChainsData(chains: Record<ChainId, Chain>): Chain[] {
  return Object.values(chains).filter((chain) => getRelaychainAsset(chain.assets));
}

function sortChains<T extends Pick<Chain, 'name' | 'options'>>(chains: T[]): T[] {
  let polkadot;
  let kusama;
  const testnets = [] as T[];
  const parachains = [] as T[];
  const numberchains = [] as T[];

  for (const chain of chains) {
    if (isPolkadot(chain.name)) polkadot = chain;
    else if (isKusama(chain.name)) kusama = chain;
    else if (isTestnet(chain.options)) testnets.push(chain);
    else if (isNameStartsWithNumber(chain.name)) numberchains.push(chain);
    else parachains.push(chain);
  }

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
  balances: BalanceMap,
  assetPrices: PriceObject | null,
  currency?: string,
): Chain[] {
  const chainsWithFiatBalance = [] as ChainWithFiatBalance[];

  const relaychains = { withBalance: [], noBalance: [] };
  const parachains = { withBalance: [], noBalance: [] };
  const numberchains = { withBalance: [], noBalance: [] };
  const testnets = { withBalance: [], noBalance: [] };

  // TODO weird code, need some refactoring
  const balancesMap: Record<string, Balance> = {};
  for (const balance of Object.values(balances)) {
    const key = `${balance.chainId}_${balance.assetId}`;
    balancesMap[key] = sumBalances(balance, balancesMap[key]);
  }

  for (const chain of chains) {
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

      continue;
    }

    const hasBalance = chain.assets.some((a) => {
      return totalAmount(balancesMap[`${chain.chainId}_${a.assetId}`]) !== ZERO_BALANCE;
    });

    let collection: Chain[] = hasBalance ? parachains.withBalance : parachains.noBalance;

    if (isPolkadot(chain.name) || isKusama(chain.name)) {
      collection = hasBalance ? relaychains.withBalance : relaychains.noBalance;
    } else if (isTestnet(chain.options)) {
      collection = hasBalance ? testnets.withBalance : testnets.noBalance;
    } else if (isNameStartsWithNumber(chain.name)) {
      collection = hasBalance ? numberchains.withBalance : numberchains.noBalance;
    }

    collection.push(chain);
  }

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

export const sumValues = (firstValue?: BN, secondValue?: BN): BN => {
  if (firstValue && secondValue) {
    return firstValue.add(secondValue);
  }

  return firstValue ?? secondValue ?? BN_ZERO;
};

export const sumBalances = <T extends AssetBalance>(firstBalance: T, secondBalance?: T): T => {
  if (!secondBalance) return firstBalance;

  return {
    ...firstBalance,
    free: sumValues(firstBalance.free, secondBalance.free),
    reserved: sumValues(firstBalance.reserved, secondBalance.reserved),
    frozen: sumValues(firstBalance.frozen, secondBalance.frozen),
    locked: (firstBalance.locked || []).concat(secondBalance.locked || []),
  };
};
