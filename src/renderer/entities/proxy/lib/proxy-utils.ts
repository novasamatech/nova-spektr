import { sortBy } from 'lodash';

import { toAddress, dictionary } from '@shared/lib/utils';
import type { ProxyAccount, AccountId, NoID, ProxyGroup, Wallet, Account, ProxyDeposits, ID } from '@shared/core';
import { ProxyType } from '@shared/core';
import { accountUtils } from '../../wallet';

export const proxyUtils = {
  isSameProxy,
  isSameProxyGroup,
  sortAccountsByProxyType,
  getProxiedName,
  getProxyGroups,
  createProxyGroups,
  getProxyTypeName,
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
    ProxyType.ANY,
    ProxyType.NON_TRANSFER,
    ProxyType.STAKING,
    ProxyType.AUCTION,
    ProxyType.CANCEL_PROXY,
    ProxyType.GOVERNANCE,
    ProxyType.IDENTITY_JUDGEMENT,
    ProxyType.NOMINATION_POOLS,
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
function getProxiedName(accountId: AccountId, proxyType: ProxyType, addressPrefix?: number): string {
  return `${proxyType} for ${toAddress(accountId, { prefix: addressPrefix, chunk: 6 })}`;
}

function getProxyGroups(wallets: Wallet[], accounts: Account[], deposits: ProxyDeposits): NoID<ProxyGroup>[] {
  const walletMap = dictionary(wallets, 'id', () => []);

  const walletsAccounts = accounts.reduce<Record<ID, Account[]>>((acc, account) => {
    if (walletMap[account.walletId]) {
      acc[account.walletId].push(account);
    }

    return acc;
  }, walletMap);

  return Object.values(walletsAccounts).reduce<NoID<ProxyGroup>[]>((acc, accounts) => {
    const walletProxyGroups = accounts.reduce<NoID<ProxyGroup>[]>((acc, account) => {
      if (!accountUtils.isChainIdMatch(account, deposits.chainId)) return acc;

      const walletDeposits = deposits.deposits[account.accountId];
      if (walletDeposits) {
        acc.push({
          walletId: account.walletId,
          proxiedAccountId: account.accountId,
          chainId: deposits.chainId,
          totalDeposit: walletDeposits,
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
function createProxyGroups(
  wallets: Wallet[],
  accounts: Account[],
  groups: ProxyGroup[],
  deposits: ProxyDeposits,
): CreateProxyGroupResult {
  const proxyGroups = getProxyGroups(wallets, accounts, deposits);

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

const ProxyTypeName: Record<ProxyType, string> = {
  [ProxyType.ANY]: 'proxy.names.any',
  [ProxyType.NON_TRANSFER]: 'proxy.names.nonTransfer',
  [ProxyType.STAKING]: 'proxy.names.staking',
  [ProxyType.AUCTION]: 'proxy.names.auction',
  [ProxyType.CANCEL_PROXY]: 'proxy.names.cancelProxy',
  [ProxyType.GOVERNANCE]: 'proxy.names.governance',
  [ProxyType.IDENTITY_JUDGEMENT]: 'proxy.names.identityJudgement',
  [ProxyType.NOMINATION_POOLS]: 'proxy.names.nominationPools',
};

function getProxyTypeName(proxyType: ProxyType | string, t: TFunction) {
  // if proxy type is not in ProxyTypeName enum split camel case string and add spaces
  return ProxyTypeName[proxyType as ProxyType]
    ? t(ProxyTypeName[proxyType as ProxyType])
    : proxyType.replace(/([a-zA-Z])(?=[A-Z])/g, '$1 ');
}
