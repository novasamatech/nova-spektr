import { sortBy, uniqBy } from 'lodash';

import { type ChainId, type ProxiedAccount, type ProxyAccount, type ProxyType, ProxyVariant } from '@/shared/core';
import { splitCamelCaseString, toAddress, toShortAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount } from '@/domains/network';

import { ProxyTypeOperation } from './constants';

export const proxyUtils = {
  isSameProxy,
  sortAccountsByProxyType,
  getProxiedName,
  getProxyTypeOperation,
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
  const typeOrder = [
    'Any',
    'NonTransfer',
    'Staking',
    'Auction',
    'CancelProxy',
    'Governance',
    'IdentityJudgement',
    'NominationPools',
  ];

  return sortBy(accounts, (account) => typeOrder.indexOf(account.proxyType));
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

function getProxyTypeOperation(proxyType: ProxyType | string): string {
  return ProxyTypeOperation[proxyType as ProxyType] || splitCamelCaseString(proxyType);
}

function getProxyAccountsOnChain(
  accounts: AnyAccount[],
  chains: ChainId[],
  proxies: Record<AccountId, ProxyAccount[]>,
) {
  if (accounts.length === 0) return {};

  const proxiesForAccounts = uniqBy(accounts, 'accountId').reduce<ProxyAccount[]>((acc, account) => {
    if (proxies[account.accountId]) {
      acc.push(...proxies[account.accountId]);
    }

    return acc;
  }, []);

  const sortedProxiesAccount = sortAccountsByProxyType(proxiesForAccounts);
  const chainsMap: Record<ChainId, ProxyAccount[]> = {};

  return sortedProxiesAccount.reduce((acc, proxy) => {
    if (chains.includes(proxy.chainId)) {
      if (proxy.chainId in acc) {
        acc[proxy.chainId].push(proxy);
      } else {
        acc[proxy.chainId] = [proxy];
      }
    }

    return acc;
  }, chainsMap);
}
