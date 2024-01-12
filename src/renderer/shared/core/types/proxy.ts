import { ProxiedAccount } from './account';
import { AccountId, ID, ChainId } from './general';

export type ProxyChainGroup = {
  id: ID;
  walletId: ID;
  proxiedAccountId: AccountId;
  chainId: ChainId;
  totalDeposit: string;
};

export type ProxyAccount = {
  id: ID;
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
  NONE = 'none',
  PURE = 'pure',
  REGULAR = 'regular',
}

export type PartialProxyAccount = Omit<ProxyAccount, 'chainId'>;

export type PartialProxiedAccount = Pick<
  ProxiedAccount,
  'chainId' | 'proxyAccountId' | 'accountId' | 'delay' | 'proxyType' | 'proxyVariant'
>;

export type ProxyDeposits = {
  chainId: ChainId;
  deposits: Record<AccountId, string>;
};
