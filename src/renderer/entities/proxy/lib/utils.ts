import type { ProxyAccount } from '@shared/core';

export const proxyUtils = {
  isSameProxies,
};

function isSameProxies(oldProxy: ProxyAccount, newProxy: ProxyAccount) {
  return (
    oldProxy.accountId === newProxy.accountId &&
    oldProxy.proxyAccountId === newProxy.proxyAccountId &&
    oldProxy.chainId === newProxy.chainId &&
    oldProxy.proxyType === newProxy.proxyType &&
    oldProxy.delay === newProxy.delay
  );
}
