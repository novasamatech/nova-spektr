import { BN_ZERO } from '@polkadot/util';
import { keyBy } from 'lodash';

import { type Asset, type Balance, type BalanceDraft, type ChainId, type OmitFirstArg } from '@/shared/core';
import { nonNullableMap } from '@/shared/lib/utils';
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

function getBalanceId(balance: Balance | BalanceDraft) {
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

function isCompleteBalance(balance: Balance | BalanceDraft): balance is Balance {
  return nonNullableMap(balance);
}

function completeBalance(balance: Balance | BalanceDraft): Balance {
  if (isCompleteBalance(balance)) return balance;

  return {
    id: getBalanceId(balance),
    accountId: balance.accountId,
    assetId: balance.assetId,
    chainId: balance.chainId,
    free: balance.free ?? BN_ZERO,
    frozen: balance.frozen ?? BN_ZERO,
    reserved: balance.reserved ?? BN_ZERO,
    locked: balance.locked ?? [],
    ed: balance.ed ?? BN_ZERO,
    transferableMode: balance.transferableMode ?? 'legacy',
  };
}

function getMergeBalances(oldBalances: (Balance | BalanceDraft)[], newBalances: (Balance | BalanceDraft)[]): Balance[] {
  const newBalancesMap = keyBy(newBalances, getBalanceId);
  const updatedBalances: Balance[] = [];

  for (const balance of oldBalances) {
    const id = getBalanceId(balance);
    const newBalance = newBalancesMap[id];

    if (newBalance) {
      delete newBalancesMap[id];

      updatedBalances.push({
        id,
        chainId: balance.chainId,
        assetId: balance.assetId,
        accountId: balance.accountId,
        free: newBalance.free ?? balance.free ?? BN_ZERO,
        frozen: newBalance.frozen ?? balance.frozen ?? BN_ZERO,
        reserved: newBalance.reserved ?? balance.reserved ?? BN_ZERO,
        locked: newBalance.locked ?? balance.locked ?? [],
        ed: newBalance.ed ?? balance.ed ?? BN_ZERO,
        transferableMode: newBalance.transferableMode ?? balance.transferableMode ?? 'legacy',
      });
    } else {
      updatedBalances.push(completeBalance(balance));
    }
  }

  const normalizedNewBalances = Object.values(newBalancesMap).map<Balance>(completeBalance);

  return updatedBalances.concat(normalizedNewBalances);
}
