import { ProxyType } from '@shared/core';

export const ProxyTypeName: Record<ProxyType, string> = {
  [ProxyType.ANY]: 'proxy.names.any',
  [ProxyType.NON_TRANSFER]: 'proxy.names.nonTransfer',
  [ProxyType.STAKING]: 'proxy.names.staking',
  [ProxyType.AUCTION]: 'proxy.names.auction',
  [ProxyType.CANCEL_PROXY]: 'proxy.names.cancelProxy',
  [ProxyType.GOVERNANCE]: 'proxy.names.governance',
  [ProxyType.IDENTITY_JUDGEMENT]: 'proxy.names.identityJudgement',
  [ProxyType.NOMINATION_POOLS]: 'proxy.names.nominationPools',
};
