import { type ChainId, type VaultChainAccount, type VaultShardAccount } from '@/shared/core';

export type VaultMap = Record<ChainId, (VaultChainAccount | VaultShardAccount[])[]>;
