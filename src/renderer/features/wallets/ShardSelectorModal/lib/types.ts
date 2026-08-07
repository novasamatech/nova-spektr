import {
  type ChainId,
  type VaultChainAccount,
  type VaultShardAccount,
  type VaultUniversalKeyAccount,
} from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';

export const EVM_GROUP_ID = 'evm';
/** Group holding the keys the user did not scope to a network. */
export const UNIVERSAL_GROUP_ID = 'universal';

export type GroupId = ChainId | typeof EVM_GROUP_ID | typeof UNIVERSAL_GROUP_ID;

export type SelectableAccount = VaultChainAccount | VaultShardAccount | VaultUniversalKeyAccount;

export type ChainTuple = [GroupId, SelectableAccount[]];
export type RootStruct = {
  rootAccountId: AccountId;
  rootAccountName: string;
  chainTuples: ChainTuple[];
};

export type RootToggleParams = { root: AccountId; value: boolean };
export type ChainToggleParams = RootToggleParams & { chainId: GroupId };
export type AccountToggleParams = ChainToggleParams & { accountId: AccountId };

export type CheckedCounter = {
  checked: number;
  total: number;
};

export type SelectedStruct = {
  [rootAccountId: AccountId]: CheckedCounter & {
    [chainId: string]: CheckedCounter & {
      accounts: {
        [accountId: AccountId]: boolean;
      };
    };
  };
};
