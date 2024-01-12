import { toAddress } from '@shared/lib/utils';
import { ProxyAccount, ProxyType, AccountId } from '@shared/core';

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

// TODO: Add i18n for wallet name
function getProxiedName(accountId: AccountId, proxyType: ProxyType, addressPrefix?: number): string {
  return `${proxyType} for ${toAddress(accountId, { prefix: addressPrefix, chunk: 6 })}`;
}
