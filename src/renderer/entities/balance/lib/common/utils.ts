import { OmitFirstArg } from '@shared/lib/types/utilityTypes';
import { AccountId, Balance, ChainId } from '@shared/core';

export const getAssetBalances = (
  balances: Balance[],
  accountIds: AccountId[],
  chainId: ChainId,
  assetId: string,
): Balance[] => {
  return balances.filter(
    (balance) => accountIds.includes(balance.accountId) && balance.chainId === chainId && balance.assetId === assetId,
  );
};

export const getBalance = (
  balances: Balance[],
  accountId: AccountId,
  chainId: ChainId,
  assetId: string,
): Balance | undefined => {
  return getAssetBalances(balances, [accountId], chainId, assetId)[0];
};

export const getBalanceWrapped = (balances: Balance[]) => {
  return (...args: Parameters<OmitFirstArg<typeof getBalance>>) => getBalance(balances, ...args);
};

export const getNetworkBalances = (balances: Balance[], accountIds: AccountId[], chainId: ChainId): Balance[] => {
  return balances.filter((balance) => accountIds.includes(balance.accountId) && balance.chainId === chainId);
};

export const getBalances = (balances: Balance[], accountIds: AccountId[]): Balance[] => {
  return balances.filter((balance) => accountIds.includes(balance.accountId));
};

export const getRepeatedIndex = (index: number, base: number): number => {
  return Math.floor(index / base);
};
