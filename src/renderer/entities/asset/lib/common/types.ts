import { BalanceDS } from '@shared/api/storage/common/types';
import { ExtendedChain } from '@entities/network/lib/common/types';
import type { ChainId, AccountId, BalanceKey } from '@shared/core';

export interface IBalanceService {
  getBalance: (accountId: AccountId, chainId: ChainId, assetId: string) => Promise<BalanceDS | undefined>;
  getLiveBalance: (accountId: AccountId, chainId: ChainId, assetId: string) => BalanceDS | undefined;
  getLiveNetworkBalances: (accountIds: AccountId[], chainId: ChainId) => BalanceDS[];
  getNetworkBalances: (accountIds: AccountId[], chainId: ChainId) => Promise<BalanceDS[]>;
  getAssetBalances: (accountIds: AccountId[], chainId: ChainId, assetId: string) => Promise<BalanceDS[]>;
  getLiveAssetBalances: (accountIds: AccountId[], chainId: ChainId, assetId: string) => BalanceDS[];
  getBalances: (accountIds: AccountId[]) => Promise<BalanceDS[]>;
  getAllBalances: () => Promise<BalanceDS[]>;
  getLiveBalances: (accountIds: AccountId[]) => BalanceDS[];
  subscribeBalances: (
    chain: ExtendedChain,
    parachain: ExtendedChain | undefined,
    accountIds: AccountId[],
  ) => Promise<any>;
  subscribeLockBalances: (chain: ExtendedChain, accountIds: AccountId[]) => Promise<any>;
  setBalanceIsValid: (balanceKey: BalanceKey, verified: boolean) => Promise<number>;
}
