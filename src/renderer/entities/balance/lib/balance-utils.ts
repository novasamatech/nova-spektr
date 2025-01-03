import keyBy from 'lodash/keyBy';

import { type Balance, type ChainId, type OmitFirstArg } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';

export const balanceUtils = {
  getAssetBalances,
  getBalance,
  getBalanceWrapped,
  getNetworkBalances,
  getAccountsBalances,
  getMergeBalances,
};

function getAssetBalances(balances: Balance[], accountIds: AccountId[], chainId: ChainId, assetId: string): Balance[] {
  return balances.filter((balance) => {
    return (
      balance.chainId === chainId && balance.assetId === assetId.toString() && accountIds.includes(balance.accountId)
    );
  });
}

function getBalance(balances: Balance[], accountId: AccountId, chainId: ChainId, assetId: string): Balance | undefined {
  return getAssetBalances(balances, [accountId], chainId, assetId)[0];
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
  const newBalancesMap = keyBy(newBalances, (b) => `${b.chainId}_${b.assetId}_${b.accountId}`);

  const updatedBalances = oldBalances.map((balance) => {
    const { chainId, assetId, accountId } = balance;
    const newBalance = newBalancesMap[`${chainId}_${assetId}_${accountId}`];

    if (newBalance) {
      balance.free = newBalance?.free || balance.free;
      balance.frozen = newBalance?.frozen || balance.frozen;
      balance.reserved = newBalance?.reserved || balance.reserved;
      balance.locked = newBalance?.locked || balance.locked;

      delete newBalancesMap[`${chainId}_${assetId}_${accountId}`];
    }

    return balance;
  });

  return updatedBalances.concat(Object.values(newBalancesMap));
}
