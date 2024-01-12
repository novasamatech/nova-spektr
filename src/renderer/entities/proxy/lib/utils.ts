import { toShortAddress } from '@shared/lib/utils';
import { ProxyAccount, AccountId, ProxyType, ProxyChainGroup, NoID } from '@shared/core';

export const proxyUtils = {
  isSameProxy,
  sortAccountsByProxyType,
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
