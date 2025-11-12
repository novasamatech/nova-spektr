import { type AccountId } from '@/shared/polkadotjs-schemas';

import { type ProxiedAccount } from './account';
import { type ChainId, type ID } from './general';

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
  | 'NominationPools'
  | 'SudoBalances';

export const enum ProxyVariant {
  NONE = 'none', // temp value, until we not receive correct proxy variant
  PURE = 'pure',
  REGULAR = 'regular',
}

export type PartialProxyAccount = Omit<ProxyAccount, 'chainId'>;

export type PartialProxiedAccount = Pick<
  ProxiedAccount,
  | 'chainId'
  | 'connections'
  | 'accountId'
  | 'proxyVariant'
  | 'entropyBlockNumber'
  | 'pendingBlockNumber'
  | 'extrinsicIndex'
  | 'deposit'
  | 'spawner'
>;
