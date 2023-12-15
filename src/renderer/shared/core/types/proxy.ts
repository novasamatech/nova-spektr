import { AccountId, ID, NoID } from './general';

export type ProxyType = 'Any' | 'NonTransfer' | 'Governance' | 'Staking';

export type ProxyAccount = {
  id: ID;
  accountId: AccountId;
  proxyAccountId: AccountId;
  chainId: string;
  proxyType: ProxyType;
  delay: number;
};

export type PartialProxyAccount = Omit<NoID<ProxyAccount>, 'accountId' | 'chainId'>;
