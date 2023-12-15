import type { Chain, BaseAccount, ChainAccount, AccountId, ChainId, ShardAccount } from '@shared/core';

// export type ChainWithAccounts = Chain & { accounts: ChainAccount[] };
// export type RootAccount = BaseAccount & { chains: ChainWithAccounts[]; amount: number };
// export type MultishardStructure = { rootAccounts: RootAccount[]; amount: number };
//
// type Selectable<T> = T & { isSelected: boolean };
// export type SelectableAccount = Selectable<ChainAccount>;
// export type SelectableChain = Selectable<Chain & { accounts: SelectableAccount[]; selectedAmount: number }>;
// export type SelectableRoot = Selectable<BaseAccount & { chains: SelectableChain[]; selectedAmount: number }>;
// export type SelectableShards = { rootAccounts: SelectableRoot[]; amount: number };

export type ChainWithAccounts = [Chain, Array<ChainAccount | ShardAccount[]>];
export type RootWithChains = [BaseAccount, Array<ChainWithAccounts>];
export type ShardsTree = Array<RootWithChains>;

export type SelectedData = {
  checked: number;
  total: number;
};

// represents account selection
// key - account id + name
export type SelectedAccounts = Record<AccountId, boolean>;

// root metadata
export type RootData = Record<AccountId, SelectedData>;

// chain metadata
// key - `rootId + chainId`
export type ChainData = Record<`${AccountId}_${ChainId}`, SelectedData>;

// sharded acc metadata
// key - chainId + groupId
export type ShardedData = Record<`${ChainId}_${string}`, SelectedData>;
