import { type ChainId, type VaultChainAccount, type VaultShardAccount } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';

export type MultishardMap = Map<AccountId, Record<ChainId, VaultChainAccount[]>>;
export type VaultMap = Record<ChainId, (VaultChainAccount | VaultShardAccount[])[]>;
