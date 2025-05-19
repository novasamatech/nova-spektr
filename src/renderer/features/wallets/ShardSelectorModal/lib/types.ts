import { type ChainId, type VaultChainAccount, type VaultShardAccount } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';

export type RootTuple = [rootAccountId: AccountId, rootAccountName: string, ChainTuple[]];
export type ChainTuple = [ChainId, (VaultChainAccount | VaultShardAccount[])[]];

export type RootToggleParams = { root: AccountId; value: boolean };
export type ChainToggleParams = RootToggleParams & { chainId: ChainId };
export type AccountToggleParams = ChainToggleParams & { accountId: AccountId };
export type ShardedToggleParams = ChainToggleParams & { groupId: string };
export type ShardToggleParams = ShardedToggleParams & { accountId: AccountId };

export type CheckedCounter = {
  checked: number;
  total: number;
};

export type SelectedStruct = {
  [rootAccountId: AccountId]: CheckedCounter & {
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

export type ChainsMap<T, K extends string = string> = {
  [chainId: ChainId]: Record<K, T[]>;
};
