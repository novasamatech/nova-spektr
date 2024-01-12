import { AccountId, ID, NoID, ProxyAccount, ProxyChainGroup } from '@shared/core';

export type ProxyStore = Record<AccountId, ProxyAccount[]>;
export type ProxyGroupStore = Record<ID, NoID<ProxyChainGroup>[]>;
export type ProxyChainGroupStore = Record<ID, ProxyChainGroup[]>;
