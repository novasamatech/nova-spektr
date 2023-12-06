import { VoidFn } from '@polkadot/api/types';

import { BalanceDS } from '@shared/api/storage/common/types';
import type { ChainId, AccountId, BalanceKey } from '@shared/core';
import { ExtendedChain } from '@entities/network';

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
  subscribeBalances: (chain: ExtendedChain, accountIds: AccountId[], relaychain?: ExtendedChain) => Promise<VoidFn[]>;
  subscribeLockBalances: (chain: ExtendedChain, accountIds: AccountId[]) => Promise<VoidFn[]>;
  setBalanceIsValid: (balanceKey: BalanceKey, verified: boolean) => Promise<number>;
}
