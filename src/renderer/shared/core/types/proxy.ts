import { AccountId } from './general';

export type ProxyType = 'Any' | 'NonTransfer' | 'Governance' | 'Staking';

export type ProxyAccount = {
  accountId: AccountId;
  proxyAccountId: AccountId;
  chainId: string;
  proxyType: ProxyType;
  delay: number;
};

export type PartialProxyAccount = Omit<ProxyAccount, 'accountId' | 'chainId'>;
