import type { AccountId, ProxyAccount } from '@shared/core';

export type ProxyStore = Record<AccountId, ProxyAccount[]>;
