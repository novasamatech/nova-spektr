import { ProxyType } from './types';
import { AccountId, ProxyAccount } from "@shared/core";

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

export type ProxyStore = Record<AccountId, ProxyAccount[]>;
