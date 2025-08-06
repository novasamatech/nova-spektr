import { BN_ZERO } from '@polkadot/util';
import { keyBy } from 'lodash';

import { type Asset, type Balance, type ChainId, type OmitFirstArg } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';

export const balanceUtils = {
  getBalanceId,
  insertBalanceId,
  getAssetBalances,
  getBalance,
  getBalanceWrapped,
  getNetworkBalances,
  getAccountsBalances,
  getMergeBalances,
};

function getBalanceId(balance: Omit<Balance, 'id'>) {
  return `${balance.accountId} ${balance.chainId} ${balance.assetId.toString()}`;
}

function insertBalanceId(balance: Omit<Balance, 'id'>): Balance {
  return {
    ...balance,
    id: getBalanceId(balance),
  };
}

function getAssetBalances(
  balances: Balance[],
  accountIds: AccountId[],
  chainId: ChainId,
  assetId: Asset['assetId'],
): Balance[] {
  return balances.filter((balance) => {
    return balance.chainId === chainId && balance.assetId === assetId && accountIds.includes(balance.accountId);
  });
}

function getBalance(
  balances: Balance[],
  accountId: AccountId,
  chainId: ChainId,
  assetId: Asset['assetId'],
): Balance | undefined {
  return getAssetBalances(balances, [accountId], chainId, assetId).at(0);
}

function getBalanceWrapped(balances: Balance[]) {
  return (...args: Parameters<OmitFirstArg<typeof getBalance>>) => getBalance(balances, ...args);
}

function getNetworkBalances(balances: Balance[], accountIds: AccountId[], chainId: ChainId): Balance[] {
  return balances.filter((balance) => balance.chainId === chainId && accountIds.includes(balance.accountId));
}

function getAccountsBalances(balances: Balance[], accountIds: AccountId[]): Balance[] {
  const accountsMap = new Set(accountIds);

  return balances.filter((balance) => accountsMap.has(balance.accountId));
}

function getMergeBalances(oldBalances: Balance[], newBalances: Balance[]): Balance[] {
  const newBalancesMap = keyBy(newBalances, (b) => b.id);
  const updatedBalances: Balance[] = [];

  for (const balance of oldBalances) {
    const newBalance = newBalancesMap[balance.id];

    if (newBalance) {
      delete newBalancesMap[balance.id];

      updatedBalances.push({
        ...balance,
        free: newBalance.free || balance.free,
        frozen: newBalance.frozen || balance.frozen,
        reserved: newBalance.reserved || balance.reserved,
        locked: newBalance.locked || balance.locked,
      });
    } else {
      updatedBalances.push(balance);
    }
  }

  const normalizedNewBalances = Object.values(newBalancesMap).map<Balance>((balance) => ({
    id: balance.id,
    accountId: balance.accountId,
    assetId: balance.assetId,
    chainId: balance.chainId,
    verified: balance.verified,
    free: balance.free ?? BN_ZERO,
    frozen: balance.frozen ?? BN_ZERO,
    reserved: balance.reserved ?? BN_ZERO,
    locked: balance.locked,
  }));

  return updatedBalances.concat(normalizedNewBalances);
}
