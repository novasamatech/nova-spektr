import type { BaseAccount, ChainAccount, ChainId, ShardAccount } from '@shared/core';

export type MultishardMap = Map<BaseAccount, Record<ChainId, ChainAccount[]>>;
export type VaultMap = Record<ChainId, Array<ChainAccount | ShardAccount[]>>;
