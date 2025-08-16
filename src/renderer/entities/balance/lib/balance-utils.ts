import { BN_ZERO } from '@polkadot/util';
import { keyBy } from 'lodash';

import {
  type Asset,
  type Balance,
  type BalanceDraft,
  type BalanceId,
  type BalanceMap,
  type ChainId,
  type OmitFirstArg,
} from '@/shared/core';
import { nonNullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';

export const balanceUtils = {
  getBalanceId,
  insertBalanceId,
  getAssetBalances,
  getBalance,
  getBalanceWrapped,
  getMergeBalances,
};

function constructBalanceId(accountId: AccountId, chainId: ChainId, assetId: Asset['assetId']): BalanceId {
  return `${accountId} ${chainId} ${assetId.toString()}` as BalanceId;
}

function getBalanceId(balance: Balance | BalanceDraft) {
  return constructBalanceId(balance.accountId, balance.chainId, balance.assetId);
}

function insertBalanceId(balance: Omit<Balance, 'id'>): Balance {
  return {
    ...balance,
    id: getBalanceId(balance),
  };
}

function getAssetBalances(
  balances: BalanceMap,
  accountIds: AccountId[],
  chainId: ChainId,
  assetId: Asset['assetId'],
): Balance[] {
  const result: Balance[] = [];
  for (const accountId of accountIds) {
    const key = constructBalanceId(accountId, chainId, assetId);
    const balance = balances[key];
    if (balance) {
      result.push(balance);
    }
  }

  return result;
}

function getBalance(
  balances: BalanceMap,
  accountId: AccountId,
  chainId: ChainId,
  assetId: Asset['assetId'],
): Balance | null {
  const key = constructBalanceId(accountId, chainId, assetId);

  return balances[key] ?? null;
}

function getBalanceWrapped(balances: BalanceMap) {
  return (...args: Parameters<OmitFirstArg<typeof getBalance>>) => getBalance(balances, ...args);
}

function isCompleteBalance(balance: Balance | BalanceDraft): balance is Balance {
  return (
    nonNullable(balance.free) &&
    nonNullable(balance.frozen) &&
    nonNullable(balance.reserved) &&
    nonNullable(balance.locked) &&
    nonNullable(balance.ed) &&
    nonNullable(balance.transferableMode)
  );
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
