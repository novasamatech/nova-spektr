import { sortBy, uniqBy } from 'lodash';

import { type ChainId, type ProxiedAccount, type ProxyAccount, ProxyTypeOrder, ProxyVariant } from '@/shared/core';
import { toAddress, toShortAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount } from '@/domains/network';

export const proxyUtils = {
  isSameProxy,
  sortAccountsByProxyType,
  getProxiedName,
  getProxyAccountsOnChain,
};

function isSameProxy(oldProxy: ProxyAccount, newProxy: ProxyAccount): boolean {
  return (
    oldProxy.accountId === newProxy.accountId &&
    oldProxy.proxiedAccountId === newProxy.proxiedAccountId &&
    oldProxy.chainId === newProxy.chainId &&
    oldProxy.proxyType === newProxy.proxyType &&
    oldProxy.delay === newProxy.delay
  );
}

function sortAccountsByProxyType(accounts: ProxyAccount[]): ProxyAccount[] {
  return sortBy(accounts, (account) => ProxyTypeOrder.indexOf(account.proxyType));
}

// TODO: Add i18n for wallet name
function getProxiedName(
  { accountId, proxyVariant, connections }: Pick<ProxiedAccount, 'connections' | 'accountId' | 'proxyVariant'>,
  addressPrefix?: number,
): string {
  const address = toShortAddress(toAddress(accountId, { prefix: addressPrefix }), 6);

  if (connections.length === 1) {
    const proxyVariantLabel = proxyVariant === ProxyVariant.PURE ? 'for pure' : 'for';
    const proxyType = connections.at(0)?.proxyType;
    return `${proxyType} ${proxyVariantLabel} ${address}`;
  } else {
    return address;
  }
}

function getProxyAccountsOnChain(
  accounts: AnyAccount[],
  chains: ChainId[],
  proxies: Record<AccountId, ProxyAccount[]>,
) {
  if (accounts.length === 0) return {};

  const proxiesForAccounts = uniqBy(accounts, 'accountId').reduce<ProxyAccount[]>((acc, account) => {
    const accountProxies = proxies[account.accountId];
    if (accountProxies) {
      acc.push(...accountProxies);
    }

    return acc;
  }, []);

  const sortedProxiesAccount = sortAccountsByProxyType(proxiesForAccounts);
  const chainsMap: Record<ChainId, ProxyAccount[]> = {};

  return sortedProxiesAccount.reduce((acc, proxy) => {
    if (chains.includes(proxy.chainId)) {
      const existing = acc[proxy.chainId];
      if (existing) {
        existing.push(proxy);
      } else {
        acc[proxy.chainId] = [proxy];
      }
    }

    return acc;
  }, chainsMap);
}
