import { SS58_DEFAULT_PREFIX, toAddress } from '@shared/lib/utils';
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

// TODO: Add i18n for wallet name
function getProxiedName(
  proxiedAccount: Pick<ProxiedAccount, 'accountId' | 'proxyType'>,
  addressPrefix = SS58_DEFAULT_PREFIX,
): string {
  return `${proxiedAccount.proxyType} for ${toAddress(proxiedAccount.accountId, {
    prefix: addressPrefix,
    chunk: 6,
  })}`;
}
