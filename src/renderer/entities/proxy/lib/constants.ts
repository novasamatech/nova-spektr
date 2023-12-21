import { ProxyType } from './types';

export const ProxyTypeName: Record<ProxyType, string> = {
  [ProxyType.Any]: 'proxy.names.any',
  [ProxyType.NonTransfer]: 'proxy.names.nonTransfer',
  [ProxyType.Staking]: 'proxy.names.staking',
  [ProxyType.Auction]: 'proxy.names.auction',
  [ProxyType.CancelProxy]: 'proxy.names.cancelProxy',
  [ProxyType.Governance]: 'proxy.names.governance',
  [ProxyType.IdentityJudgement]: 'proxy.names.identityJudgement',
  [ProxyType.NominationPools]: 'proxy.names.nominationPools',
};

export const ProxyTypeOperations: Record<ProxyType, string> = {
  [ProxyType.Any]: 'proxy.operations.any',
  [ProxyType.NonTransfer]: 'proxy.operations.nonTransfer',
  [ProxyType.Staking]: 'proxy.operations.staking',
  [ProxyType.Auction]: 'proxy.operations.auction',
  [ProxyType.CancelProxy]: 'proxy.operations.cancelProxy',
  [ProxyType.Governance]: 'proxy.operations.governance',
  [ProxyType.IdentityJudgement]: 'proxy.operations.identityJudgement',
  [ProxyType.NominationPools]: 'proxy.operations.nominationPools',
};
