import { BN } from '@polkadot/util';
import BigNumber from 'bignumber.js';
import { groupBy } from 'lodash';

import { Decimal, totalAmount, isStringsMatchQuery } from '@shared/lib/utils';
import { PriceObject } from '@shared/api/price-provider';
import { accountUtils } from '@entities/wallet';
import { RootAccount, SelectableShards, ChainsRecord, ChainWithAccounts, MultishardStructure } from '../common/types';
import type { Asset, Balance, BaseAccount, ChainAccount, Account } from '@shared/core';

export const sumBalances = (firstBalance: Balance, secondBalance?: Balance): Balance => {
  if (!secondBalance) return firstBalance;

  return {
    ...firstBalance,
    verified: firstBalance.verified && secondBalance.verified,
    free: sumValues(firstBalance.free, secondBalance.free),
    reserved: sumValues(firstBalance.reserved, secondBalance.reserved),
    frozen: sumValues(firstBalance.frozen, secondBalance.frozen),
    locked: (firstBalance.locked || []).concat(secondBalance.locked || []),
  };
};

export const sumValues = (firstValue?: string, secondValue?: string): string => {
  if (firstValue && secondValue) {
    return new BN(firstValue).add(new BN(secondValue)).toString();
  }

  return firstValue || '0';
};

const getBalanceBn = (balance: string, precision: number) => {
  const BNWithConfig = BigNumber.clone();
  BNWithConfig.config({
    // HOOK: for divide with decimal part
    DECIMAL_PLACES: precision || Decimal.SMALL_NUMBER,
    ROUNDING_MODE: BNWithConfig.ROUND_DOWN,
    FORMAT: {
      decimalSeparator: '.',
      groupSeparator: '',
    },
  });
  const TEN = new BNWithConfig(10);
  const bnPrecision = new BNWithConfig(precision);

  return new BNWithConfig(balance).div(TEN.pow(bnPrecision));
};

export const balanceSorter = (
  first: Asset,
  second: Asset,
  balancesObject: Record<string, Balance>,
  assetPrices: PriceObject | null,
  currency?: string,
) => {
  const firstTotal = totalAmount(balancesObject[first.assetId.toString()]);
  const secondTotal = totalAmount(balancesObject[second.assetId.toString()]);

  const firstBalance = getBalanceBn(firstTotal, first.precision);
  const secondBalance = getBalanceBn(secondTotal, second.precision);

  const firstAssetPrice = first.priceId && currency && assetPrices?.[first.priceId]?.[currency]?.price;
  const secondAssetPrice = second.priceId && currency && assetPrices?.[second.priceId]?.[currency]?.price;

  const firstFiatBalance = new BigNumber(firstAssetPrice || 0).multipliedBy(firstBalance);
  const secondFiatBalance = new BigNumber(secondAssetPrice || 0).multipliedBy(secondBalance);

  if (firstFiatBalance.gt(secondFiatBalance)) return -1;
  if (firstFiatBalance.lt(secondFiatBalance)) return 1;

  if (firstBalance.gt(secondBalance)) return -1;
  if (firstBalance.lt(secondBalance)) return 1;

  return first.name.localeCompare(second.name);
};

const getBaseAccountGroup = (base: BaseAccount, accounts: ChainAccount[], chains: ChainsRecord): RootAccount => {
  const accountsByChain = groupBy(accounts, ({ chainId }) => chainId);

  // iterate by chain and not the account to preserve chains order (if sorted)
  const chainAccounts = Object.values(chains).reduce<ChainWithAccounts[]>((acc, chain) => {
    if (accountsByChain[chain.chainId]) {
      acc.push({ ...chain, accounts: accountsByChain[chain.chainId] });
    }

    return acc;
  }, []);

  // start with 1 because we want to count root acc as well
  const accountsAmount = chainAccounts.reduce((acc, chain) => acc + chain.accounts.length, 1);

  return {
    ...base,
    chains: chainAccounts,
    amount: accountsAmount,
  };
};

export const getMultishardStructure = (accounts: Account[], chains: ChainsRecord): MultishardStructure => {
  const chainAccounts = accounts.filter(accountUtils.isChainAccount);

  const rootAccounts = accounts.reduce<RootAccount[]>((acc, account) => {
    if (accountUtils.isBaseAccount(account)) {
      acc.push(getBaseAccountGroup(account, chainAccounts, chains));
    }

    return acc;
  }, []);

  const accountsAmount = rootAccounts.reduce((acc, root) => acc + root.amount, 0);

  return {
    rootAccounts,
    amount: accountsAmount,
  };
};

export const getSelectableShards = (multishard: MultishardStructure, ids: Account['id'][]): SelectableShards => {
  const rootAccounts = multishard.rootAccounts.map((root) => {
    const chains = root.chains.map((chain) => {
      const accounts = chain.accounts.map((a) => ({ ...a, isSelected: ids.includes(a.id) }));
      const selectedAccounts = accounts.filter((a) => a.isSelected);

      return {
        ...chain,
        accounts,
        isSelected: selectedAccounts.length === accounts.length,
        selectedAmount: selectedAccounts.length,
      };
    });

    return {
      ...root,
      chains,
      isSelected: ids.includes(root.id),
      selectedAmount: chains.filter((c) => c.isSelected).length,
    };
  });

  return { ...multishard, rootAccounts };
};

export const searchShards = (shards: SelectableShards, query: string): SelectableShards => {
  const rootAccounts = shards.rootAccounts.map((root) => {
    const chains = root.chains.map((chain) => ({
      ...chain,
      accounts: chain.accounts.filter((a) => isStringsMatchQuery(query, [a.name, a.accountId])),
    }));

    return {
      ...root,
      chains: chains.filter((c) => c.accounts.length),
    };
  });

  return {
    ...shards,
    rootAccounts: rootAccounts.filter(
      (root) => isStringsMatchQuery(query, [root.name, root.accountId]) || root.chains.length,
    ),
  };
};
