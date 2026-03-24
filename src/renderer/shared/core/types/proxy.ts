import { type AccountId } from '@/shared/polkadotjs-schemas';

import { type ProxiedAccount } from './account';
import { type ChainId, type ID } from './general';

export const ProxyTypes = {
  ANY: 'Any',
  NON_TRANSFER: 'NonTransfer',
  STAKING: 'Staking',
  AUCTION: 'Auction',
  CANCEL_PROXY: 'CancelProxy',
  GOVERNANCE: 'Governance',
  IDENTITY_JUDGEMENT: 'IdentityJudgement',
  NOMINATION_POOLS: 'NominationPools',
  SUDO_BALANCES: 'SudoBalances',
} as const;

export type ProxyType = (typeof ProxyTypes)[keyof typeof ProxyTypes];

export const ProxyTypeOrder: readonly ProxyType[] = [
  ProxyTypes.ANY,
  ProxyTypes.NON_TRANSFER,
  ProxyTypes.STAKING,
  ProxyTypes.AUCTION,
  ProxyTypes.CANCEL_PROXY,
  ProxyTypes.GOVERNANCE,
  ProxyTypes.IDENTITY_JUDGEMENT,
  ProxyTypes.NOMINATION_POOLS,
  ProxyTypes.SUDO_BALANCES,
];

export type ProxyAccount = {
  id: ID;
  accountId: AccountId;
  proxiedAccountId: AccountId;
  chainId: ChainId;
  proxyType: ProxyType;
  delay: number;
};

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
