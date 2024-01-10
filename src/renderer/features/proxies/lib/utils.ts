import { NotificationType, Chain } from '@shared/core';
import type { ProxyAccount, Account, ProxyAction, NoID, Wallet } from '@shared/core';
import { dictionary } from '@shared/lib/utils';

export const proxiesUtils = {
  isRegularProxy,
  getNotification,
};

function isRegularProxy(chain: Chain): boolean {
  return Boolean(chain.options?.includes('regular_proxy'));
}

function getNotification(
  proxies: ProxyAccount[],
  wallets: Wallet[],
  accounts: Account[],
  type: NotificationType,
): NoID<ProxyAction>[] {
  const walletsMap = dictionary(wallets, 'id', ({ name, type }) => ({ name, type }));
  const accountsWalletsMap = dictionary(accounts, 'accountId', (account) => walletsMap[account.walletId]);

  return proxies.map((proxy) => ({
    chainId: proxy.chainId,
    dateCreated: Date.now(),
    proxiedAccountId: proxy.proxiedAccountId,
    proxiedWalletType: accountsWalletsMap[proxy.proxiedAccountId].type,
    proxiedWalletName: accountsWalletsMap[proxy.proxiedAccountId].name,
    proxyAccountId: proxy.accountId,
    proxyType: proxy.proxyType,
    proxyWalletName: accountsWalletsMap[proxy.accountId].name,
    read: false,
    type,
  }));
}
