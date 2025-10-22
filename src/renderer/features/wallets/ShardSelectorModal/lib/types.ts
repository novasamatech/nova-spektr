import { type ChainId, type VaultChainAccount, type VaultShardAccount } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';

export type ChainTuple = [ChainId | 'evm', (VaultChainAccount | VaultShardAccount)[]];
export type RootStruct = {
  rootAccountId: AccountId;
  rootAccountName: string;
  chainTuples: ChainTuple[];
};

export type RootToggleParams = { root: AccountId; value: boolean };
export type ChainToggleParams = RootToggleParams & { chainId: ChainId | 'evm' };
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
