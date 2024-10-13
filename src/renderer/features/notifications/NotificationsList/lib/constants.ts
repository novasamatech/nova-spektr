import { ProxyType } from '@/shared/core';

export const ProxyTypeOperation: Record<ProxyType, string> = {
  [ProxyType.ANY]: 'proxy.operations.any',
  [ProxyType.NON_TRANSFER]: 'proxy.operations.nonTransfer',
  [ProxyType.STAKING]: 'proxy.operations.staking',
  [ProxyType.AUCTION]: 'proxy.operations.auction',
  [ProxyType.CANCEL_PROXY]: 'proxy.operations.cancelProxy',
  [ProxyType.GOVERNANCE]: 'proxy.operations.governance',
  [ProxyType.IDENTITY_JUDGEMENT]: 'proxy.operations.identityJudgement',
  [ProxyType.NOMINATION_POOLS]: 'proxy.operations.nominationPools',
};
