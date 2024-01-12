import type { Account, ProxyAction, NoID, Wallet } from '@shared/core';
import { NotificationType, Chain, type PartialProxiedAccount } from '@shared/core';
import { dictionary } from '@shared/lib/utils';
import { proxyUtils } from '@entities/proxy';

export const proxiesUtils = {
  isRegularProxy,
  getNotification,
};

function isRegularProxy(chain: Chain): boolean {
  return Boolean(chain.options?.includes('regular_proxy'));
}

function getNotification(
  proxiedAccounts: PartialProxiedAccount[],
  wallets: Wallet[],
  accounts: Account[],
  type: NotificationType,
): NoID<ProxyAction>[] {
  const walletsMap = dictionary(wallets, 'id', ({ name, type }) => ({ name, type }));
  const accountsWalletsMap = dictionary(accounts, 'accountId', (account) => walletsMap[account.walletId]);

  return proxiedAccounts.map((proxied) => ({
    chainId: proxied.chainId,
    dateCreated: Date.now(),
    proxyType: proxied.proxyType,
    proxyAccountId: proxied.proxyAccountId,
    proxyWalletName: accountsWalletsMap[proxied.proxyAccountId].name,
    proxyWalletType: accountsWalletsMap[proxied.proxyAccountId].type,
    proxiedAccountId: proxied.accountId,
    proxiedWalletName: proxyUtils.getProxiedName(proxied.accountId, proxied.proxyType),
    read: false,
    type,
  }));
}
