import { AccountId, NoID, ChainType, ID, ChainId } from './general';

export type ProxyChainGroup = {
  id: ID;
  walletId: ID;
  proxiedAccountId: AccountId;
  chainId: ChainId;
  totalDeposit: number;
};

export type ProxyAccount = {
  accountId: AccountId;
  proxiedAccountId: AccountId;
  chainId: string;
  proxyType: ProxyType;
  delay: number;
};

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

export const enum ProxyVariant {
  PURE = 'pure',
  REGULAR = 'regular',
}

export type PartialProxyAccount = Omit<ProxyAccount, 'chainId'>;
