import { toAddress } from '@shared/lib/utils';
import { ProxyAccount, ProxyType, AccountId, NoID, ProxyGroup, Wallet, Account, ProxyDeposits } from '@shared/core';

export const proxyUtils = {
  isSameProxy,
  isSameProxyGroup,
  sortAccountsByProxyType,
  getProxiedName,
  getProxyGroups,
  isAnyProxyType,
  isNonTransferProxyType,
  isStakingProxyType,
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

function isAnyProxyType({ proxyType }: { proxyType: ProxyType }) {
  return proxyType === ProxyType.ANY;
}

function isNonTransferProxyType({ proxyType }: { proxyType: ProxyType }) {
  return proxyType === ProxyType.NON_TRANSFER;
}

function isStakingProxyType({ proxyType }: { proxyType: ProxyType }) {
  return proxyType === ProxyType.STAKING;
}
