import { toShortAddress } from '@shared/lib/utils';
import { ProxyAccount, AccountId, ProxyType, ProxyGroup, NoID, Wallet, Account, ProxyDeposits } from '@shared/core';

export const proxyUtils = {
  isSameProxy,
  isSameProxyGroup,
  getProxiedName,
  getProxyGroups,
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

function isSameProxyGroup(oldGroup: NoID<ProxyGroup>, newGroup: NoID<ProxyGroup>) {
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
