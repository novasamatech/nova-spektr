import { BN_ZERO } from '@polkadot/util';
import { uniq } from 'lodash';

import {
  type AssetId,
  type Balance,
  type BalanceDraft,
  type BalanceId,
  type BalanceMap,
  type ChainId,
} from '@/shared/core';
import { isEqual, nullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';

export const balanceUtils = {
  getBalanceId,
  constructBalanceId,
  insertBalanceId,
  getAssetBalances,
  getBalance,
  getBalanceById,
  mergeBalanceMapWithNewBalances,
};

function constructBalanceId(accountId: AccountId, chainId: ChainId, assetId: AssetId): BalanceId {
  // expected type assign
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
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
  assetId: AssetId,
): Balance[] {
  const result: Balance[] = [];
  for (const accountId of uniq(accountIds)) {
    const key = constructBalanceId(accountId, chainId, assetId);
    const balance = balances[key];
    if (balance) {
      result.push(balance);
    }
  }

  return result;
}

function getBalance(balances: BalanceMap, accountId: AccountId, chainId: ChainId, assetId: AssetId): Balance | null {
  return getBalanceById(balances, constructBalanceId(accountId, chainId, assetId));
}

function getBalanceById(balances: BalanceMap, balanceId: BalanceId): Balance | null {
  return balances[balanceId] ?? null;
}

function completeBalance(id: BalanceId, balance: Balance | BalanceDraft): Balance {
  return {
    id,
    accountId: balance.accountId,
    assetId: balance.assetId,
    assetType: balance.assetType,
    chainId: balance.chainId,
    free: balance.free ?? BN_ZERO,
    frozen: balance.frozen ?? BN_ZERO,
    reserved: balance.reserved ?? BN_ZERO,
    locked: balance.locked ?? [],
    providers: balance.providers ?? 0,
    consumers: balance.consumers ?? 0,
    sufficients: balance.sufficients ?? 0,
    ed: balance.ed ?? BN_ZERO,
    transferableMode: balance.transferableMode ?? 'legacy',
  };
}

function mergeTwoBalances(id: BalanceId, a: Balance | BalanceDraft, b: Balance | BalanceDraft): Balance {
  return {
    id,
    chainId: a.chainId,
    assetId: a.assetId,
    assetType: a.assetType,
    accountId: a.accountId,
    free: b.free ?? a.free ?? BN_ZERO,
    frozen: b.frozen ?? a.frozen ?? BN_ZERO,
    reserved: b.reserved ?? a.reserved ?? BN_ZERO,
    locked: b.locked ?? a.locked ?? [],
    providers: b.providers ?? a.providers ?? 0,
    consumers: b.consumers ?? a.consumers ?? 0,
    sufficients: b.sufficients ?? a.sufficients ?? 0,
    ed: b.ed ?? a.ed ?? BN_ZERO,
    transferableMode: b.transferableMode ?? a.transferableMode ?? 'legacy',
  };
}

/**
 * ATTENTION! This method can break balance updating when new fields got
 * introduced.
 */
function areValuesAreTheSame(balance: Balance, draft: BalanceDraft) {
  return (
    (nullable(draft.free) || balance.free.eq(draft.free)) &&
    (nullable(draft.frozen) || balance.frozen.eq(draft.frozen)) &&
    (nullable(draft.reserved) || balance.reserved.eq(draft.reserved)) &&
    (nullable(draft.ed) || balance.ed.eq(draft.ed)) &&
    (nullable(draft.providers) || balance.providers === draft.providers) &&
    (nullable(draft.consumers) || balance.consumers === draft.consumers) &&
    (nullable(draft.sufficients) || balance.sufficients === draft.sufficients) &&
    (nullable(draft.transferableMode) || balance.transferableMode === draft.transferableMode) &&
    (nullable(draft.locked) || isEqual(balance.locked, draft.locked))
  );
}

function mergeBalanceMapWithNewBalances(balances: BalanceMap, newBalances: (Balance | BalanceDraft)[]) {
  if (newBalances.length === 0) {
    return {
      map: balances,
      updated: {},
    };
  }

  let hasUpdates = false;
  const updated: BalanceMap = {};
  const map: BalanceMap = { ...balances };

  for (const newBalance of newBalances) {
    const id = 'id' in newBalance ? newBalance.id : getBalanceId(newBalance);
    const oldBalance = map[id];

    if (oldBalance && areValuesAreTheSame(oldBalance, newBalance)) {
      continue;
    }

    const updatedBalance = oldBalance ? mergeTwoBalances(id, oldBalance, newBalance) : completeBalance(id, newBalance);

    map[id] = updated[id] = updatedBalance;
    hasUpdates = true;
  }

  if (hasUpdates) {
    return {
      map,
      updated,
    };
  } else {
    return {
      map: balances,
      updated: {},
    };
  }
}
