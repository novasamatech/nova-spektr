import type { BaseAccount, ChainId, ChainAccount } from '@shared/core';

export type MultishardMap = Map<BaseAccount, Record<ChainId, ChainAccount[]>>;
