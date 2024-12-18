import { type ProxyType } from '@/shared/core';

export const ProxyTypeName: Record<ProxyType, string> = {
  Any: 'proxy.names.any',
  NonTransfer: 'proxy.names.nonTransfer',
  Staking: 'proxy.names.staking',
  Auction: 'proxy.names.auction',
  CancelProxy: 'proxy.names.cancelProxy',
  Governance: 'proxy.names.governance',
  IdentityJudgement: 'proxy.names.identityJudgement',
  NominationPools: 'proxy.names.nominationPools',
};
