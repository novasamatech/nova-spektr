import type { BaseAccount, ChainAccount, ShardAccount, ChainId, AccountId, ID } from '@shared/core';

export type RootTuple = [BaseAccount, ChainTuple[]];
export type ChainTuple = [ChainId, Array<ChainAccount | ShardAccount[]>];

export type CheckedCounter = {
  checked: number;
  total: number;
};

export type SelectedStruct = {
  [baseId: ID]: CheckedCounter & {
    [chainId: ChainId]: CheckedCounter & {
      accounts: {
        [accountId: AccountId]: boolean;
      };
      sharded: {
        [groupId: string]: CheckedCounter & {
          [accountId: AccountId]: boolean;
        };
      };
    };
  };
};


export type ChainsMap<T> = {
  [chainId: ChainId]: {
    [key: string]: Array<T>;
  };
};
