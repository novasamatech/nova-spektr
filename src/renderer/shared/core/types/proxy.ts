import { AccountId, ID, NoID } from './general';

export const enum ProxyType {
  ANY = 'Any',
  NON_TRANSFER = 'NonTransfer',
  STAKING = 'Staking',
  AUCTION = 'Auction',
  CANCEL_PROXY = 'CancelProxy',
  GOVERNANCE = 'Governance',
  IDENTITY_JUDGEMENT = 'IdentityJudgement',
  NOMINATION_POOLS = 'NominationPools',
}

export type ProxyAccount = {
  id: ID;
  accountId: AccountId;
  proxyAccountId: AccountId;
  chainId: string;
  proxyType: ProxyType;
  delay: number;
};

export type PartialProxyAccount = Omit<NoID<ProxyAccount>, 'accountId' | 'chainId'>;
