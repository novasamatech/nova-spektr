import type { BaseAccount, ChainId, ChainAccount } from '@renderer/shared/core';

export type MultishardMap = Map<BaseAccount, Record<ChainId, ChainAccount[]>>;
