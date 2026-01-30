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
  SudoBalances: 'proxy.names.sudoBalances',
};

export const ProxyTypeOperation: Record<ProxyType, string> = {
  Any: 'proxy.operations.any',
  NonTransfer: 'proxy.operations.nonTransfer',
  Staking: 'proxy.operations.staking',
  Auction: 'proxy.operations.auction',
  CancelProxy: 'proxy.operations.cancelProxy',
  Governance: 'proxy.operations.governance',
  IdentityJudgement: 'proxy.operations.identityJudgement',
  NominationPools: 'proxy.operations.nominationPools',
  SudoBalances: 'proxy.operations.sudoBalances',
};
