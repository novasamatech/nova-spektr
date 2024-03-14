import type { AccountId, Balance, ChainId, OmitFirstArg } from '@shared/core';

export const balanceUtils = {
  getAssetBalances,
  getBalance,
  getBalanceWrapped,
  getNetworkBalances,
  getAccountsBalances,
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
