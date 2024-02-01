import { splitCamelCaseString, toAddress } from '@shared/lib/utils';
import { ProxyAccount, ProxyType, AccountId, NoID, ProxyGroup, Wallet, Account, ProxyDeposits } from '@shared/core';

export const proxyUtils = {
  isSameProxy,
  isSameProxyGroup,
  sortAccountsByProxyType,
  getProxiedName,
  getProxyGroups,
  createProxyGroups,
  getProxyTypeName,
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

  return [...accounts].sort((a, b) => typeOrder.indexOf(a.proxyType) - typeOrder.indexOf(b.proxyType));
}

function isSameProxyGroup(oldGroup: NoID<ProxyGroup>, newGroup: NoID<ProxyGroup>) {
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
  return wallets.reduce<NoID<ProxyGroup>[]>((acc, w) => {
    const walletAccounts = accounts.filter((a) => a.walletId === w.id);

    if (walletAccounts.length > 0) {
      const walletProxyGroups = walletAccounts.reduce<NoID<ProxyGroup>[]>((acc, a) => {
        const walletDeposits = deposits.deposits[a.accountId];
        if (!walletDeposits) return acc;

        acc.push({
          walletId: w.id,
          proxiedAccountId: a.accountId,
          chainId: deposits.chainId,
          totalDeposit: walletDeposits,
        });

        return acc;
      }, []);

      acc = acc.concat(walletProxyGroups);
    }

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

function getProxyTypeName(proxyType: ProxyType | string): string {
  return ProxyTypeName[proxyType as ProxyType] || splitCamelCaseString(proxyType as string);
}
