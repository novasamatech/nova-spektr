import { type AccountId } from '@/shared/polkadotjs-schemas';

import { type ProxiedAccount } from './account';
import { type ChainId, type ID } from './general';

export type ProxyGroup = {
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
  chainId: ChainId;
  proxyType: ProxyType;
  delay: number;
};

export type ProxyType =
  | 'Any'
  | 'NonTransfer'
  | 'Staking'
  | 'Auction'
  | 'CancelProxy'
  | 'Governance'
  | 'IdentityJudgement'
  | 'NominationPools';

export const enum ProxyVariant {
  NONE = 'none', // temp value, until we not receive correct proxy variant
  PURE = 'pure',
  REGULAR = 'regular',
}

export type PartialProxyAccount = Omit<ProxyAccount, 'chainId'>;

export type PartialProxiedAccount = Pick<
  ProxiedAccount,
  'chainId' | 'proxyAccountId' | 'accountId' | 'delay' | 'proxyType' | 'proxyVariant' | 'blockNumber' | 'extrinsicIndex'
>;

export type ProxyDeposits = {
  chainId: ChainId;
  deposits: Record<AccountId, string>;
};
