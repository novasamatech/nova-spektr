import { toShortAddress } from '@shared/lib/utils';
import type { ProxiedAccount, ProxyAccount } from '@shared/core';

export const proxyUtils = {
  isSameProxy,
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

function getProxiedName(proxiedAccount: Pick<ProxiedAccount, 'accountId' | 'proxyType'>): string {
  return `${proxiedAccount.proxyType} for ${toShortAddress(proxiedAccount.accountId)}`;
}
