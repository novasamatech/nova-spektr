import { type ChainId, type VaultBaseAccount, type VaultChainAccount, type VaultShardAccount } from '@/shared/core';

export type MultishardMap = Map<VaultBaseAccount, Record<ChainId, VaultChainAccount[]>>;
export type VaultMap = Record<ChainId, (VaultChainAccount | VaultShardAccount[])[]>;
