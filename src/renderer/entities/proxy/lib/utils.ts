import type { ProxiedAccount, ProxyAccount } from '@shared/core';
import { ProxyType } from '@shared/core';
import { toShortAddress } from '@shared/lib/utils';

export const proxyUtils = {
  isSameProxy,
  sortAccountsByProxyType,
  getProxiedName,
};

function isSameProxy(oldProxy: ProxyAccount, newProxy: ProxyAccount) {
  return (
    oldProxy.accountId === newProxy.accountId &&
    oldProxy.proxiedAccountId === newProxy.proxiedAccountId &&
    oldProxy.chainId === newProxy.chainId &&
    oldProxy.proxyType === newProxy.proxyType &&
    oldProxy.delay === newProxy.delay
  );
}
function sortAccountsByProxyType(accounts: ProxyAccount[]) {
  const typeOrder = [
    ProxyType.ANY,
    ProxyType.NON_TRANSFER,
    ProxyType.STAKING,
    ProxyType.AUCTION,
    ProxyType.CANCEL_PROXY,
    ProxyType.GOVERNANCE,
    ProxyType.IDENTITY_JUDGEMENT,
    ProxyType.NOMINATION_POOLS,
  ];

  return accounts.sort((a, b) => typeOrder.indexOf(a.proxyType) - typeOrder.indexOf(b.proxyType));
}
// TODO: Add i18n for wallet name
function getProxiedName(proxiedAccount: Pick<ProxiedAccount, 'accountId' | 'proxyType'>): string {
  return `${proxiedAccount.proxyType} for ${toShortAddress(proxiedAccount.accountId)}`;
}
