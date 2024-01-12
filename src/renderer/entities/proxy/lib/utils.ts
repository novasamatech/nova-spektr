import { toShortAddress } from '@shared/lib/utils';
import { ProxyAccount, AccountId, ProxyType, ProxyChainGroup, NoID } from '@shared/core';

export const proxyUtils = {
  isSameProxy,
  isSameProxyChainGroup,
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

function isSameProxyChainGroup(oldGroup: NoID<ProxyChainGroup>, newGroup: NoID<ProxyChainGroup>) {
  return (
    oldGroup.walletId === newGroup.walletId &&
    oldGroup.proxiedAccountId === newGroup.proxiedAccountId &&
    oldGroup.chainId === newGroup.chainId
  );
}

// TODO: Add i18n for wallet name
function getProxiedName(accountId: AccountId, proxyType: ProxyType): string {
  return `${proxyType} for ${toShortAddress(accountId)}`;
}
