import { type BaseAccount, type ChainAccount, type ChainId, type ShardAccount } from '@shared/core';

export type MultishardMap = Map<BaseAccount, Record<ChainId, ChainAccount[]>>;
export type VaultMap = Record<ChainId, Array<ChainAccount | ShardAccount[]>>;
