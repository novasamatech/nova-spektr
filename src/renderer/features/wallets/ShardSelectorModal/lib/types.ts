import type { AccountId, BaseAccount, ChainAccount, ChainId, ID, ShardAccount } from '@shared/core';

export type RootTuple = [BaseAccount, ChainTuple[]];
export type ChainTuple = [ChainId, Array<ChainAccount | ShardAccount[]>];

export type RootToggleParams = { root: ID; value: boolean };
export type ChainToggleParams = RootToggleParams & { chainId: ChainId };
export type AccountToggleParams = ChainToggleParams & { accountId: AccountId };
export type ShardedToggleParams = ChainToggleParams & { groupId: string };
export type ShardToggleParams = ShardedToggleParams & { accountId: AccountId };

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
