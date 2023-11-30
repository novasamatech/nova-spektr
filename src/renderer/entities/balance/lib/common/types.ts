import { VoidFn } from '@polkadot/api/types';
import { ApiPromise } from '@polkadot/api';

import { BalanceDS } from '@shared/api/storage/common/types';
import type { ChainId, AccountId, Balance, Chain } from '@shared/core';

export interface IBalanceService {
  getBalance: (accountId: AccountId, chainId: ChainId, assetId: string) => Promise<BalanceDS | undefined>;
  getBalances: (accountIds: AccountId[]) => Promise<BalanceDS[]>;
  getAllBalances: () => Promise<BalanceDS[]>;
  insertBalances: (balances: Balance[]) => Promise<string[]>;
  subscribeBalances: (
    chain: Chain,
    api: ApiPromise,
    accountIds: AccountId[],
    cb?: (newBalances: Balance[]) => void,
  ) => Promise<VoidFn[]>;
  subscribeLockBalances: (
    chain: Chain,
    api: ApiPromise,
    accountIds: AccountId[],
    cb?: (newBalances: Balance[]) => void,
  ) => Promise<VoidFn[]>;
}
