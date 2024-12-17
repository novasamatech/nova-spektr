import { type ProxyType } from '@/shared/core';

export const ProxyTypeOperation: Record<ProxyType, string> = {
  ['Any']: 'proxy.operations.any',
  ['NonTransfer']: 'proxy.operations.nonTransfer',
  ['Staking']: 'proxy.operations.staking',
  ['Auction']: 'proxy.operations.auction',
  ['CancelProxy']: 'proxy.operations.cancelProxy',
  ['Governance']: 'proxy.operations.governance',
  ['IdentityJudgement']: 'proxy.operations.identityJudgement',
  ['NominationPools']: 'proxy.operations.nominationPools',
};
