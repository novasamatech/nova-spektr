import sortBy from 'lodash/sortBy';
import uniqBy from 'lodash/uniqBy';

import {
  type Account,
  type AccountId,
  type ChainId,
  type NoID,
  type PartialProxiedAccount,
  type ProxyAccount,
  type ProxyDeposits,
  type ProxyGroup,
  type ProxyType,
  ProxyVariant,
  type Wallet,
} from '@/shared/core';
import { splitCamelCaseString, toAddress } from '@/shared/lib/utils';
import { accountUtils } from '@/entities/wallet';

import { ProxyTypeName } from './constants';

export const proxyUtils = {
  isSameProxy,
  isSameProxyGroup,
  sortAccountsByProxyType,
  getProxiedName,
  getProxyGroups,
  createProxyGroups,
  getProxyTypeName,
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

function isSameProxyGroup(oldGroup: NoID<ProxyGroup>, newGroup: NoID<ProxyGroup>): boolean {
  return (
    oldGroup.walletId === newGroup.walletId &&
    oldGroup.proxiedAccountId === newGroup.proxiedAccountId &&
    oldGroup.chainId === newGroup.chainId
  );
}

// TODO: Add i18n for wallet name
function getProxiedName({ accountId, proxyVariant, proxyType }: PartialProxiedAccount, addressPrefix?: number): string {
  const address = toAddress(accountId, {
    prefix: addressPrefix,
    chunk: 6,
  });
  const proxyVariantLabel = proxyVariant === ProxyVariant.PURE ? 'for pure' : 'for';

  return `${proxyType} ${proxyVariantLabel} ${address}`;
}

function getProxyGroups(wallets: Wallet[], deposits: ProxyDeposits): NoID<ProxyGroup>[] {
  const walletsAccounts = wallets.map(({ accounts }) => accounts);

  return Object.values(walletsAccounts).reduce<NoID<ProxyGroup>[]>((acc, accounts) => {
    const walletProxyGroups = accounts.reduce<NoID<ProxyGroup>[]>((acc, account) => {
      const isChainMatch = accountUtils.isChainIdMatch(account, deposits.chainId);
      const accountDeposit = deposits.deposits[account.accountId];

      if (isChainMatch && accountDeposit) {
        acc.push({
          walletId: account.walletId,
          proxiedAccountId: account.accountId,
          chainId: deposits.chainId,
          totalDeposit: accountDeposit,
        });
      }

      return acc;
    }, []);

    acc.push(...walletProxyGroups);

    return acc;
  }, []);
}

type CreateProxyGroupResult = {
  toAdd: NoID<ProxyGroup>[];
  toUpdate: NoID<ProxyGroup>[];
  toRemove: ProxyGroup[];
};
function createProxyGroups(wallets: Wallet[], groups: ProxyGroup[], deposits: ProxyDeposits): CreateProxyGroupResult {
  const proxyGroups = getProxyGroups(wallets, deposits);

  const { toAdd, toUpdate } = proxyGroups.reduce<Record<'toAdd' | 'toUpdate', NoID<ProxyGroup>[]>>(
    (acc, g) => {
      const shouldUpdate = groups.some((p) => isSameProxyGroup(p, g));

      if (shouldUpdate) {
        acc.toUpdate.push(g);
      } else {
        acc.toAdd.push(g);
      }

      return acc;
    },
    { toAdd: [], toUpdate: [] },
  );

  const toRemove = groups.filter((p) => {
    if (p.chainId !== deposits.chainId) return false;

    return proxyGroups.every((g) => !proxyUtils.isSameProxyGroup(g, p));
  });

  return { toAdd, toUpdate, toRemove };
}

function getProxyTypeName(proxyType: ProxyType | string): string {
  return ProxyTypeName[proxyType as ProxyType] || splitCamelCaseString(proxyType as string);
}

function getProxyAccountsOnChain(accounts: Account[], chains: ChainId[], proxies: Record<AccountId, ProxyAccount[]>) {
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
