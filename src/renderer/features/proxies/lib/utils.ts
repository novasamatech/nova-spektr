import { NotificationType, Chain } from '@shared/core';
import type { ProxyAccount, Account, ProxyAction, NoID, Wallet } from '@shared/core';
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
    proxyType: proxy.proxyType,
    proxyAccountId: proxy.accountId,
    proxyWalletName: accountsWalletsMap[proxy.accountId].name,
    proxyWalletType: accountsWalletsMap[proxy.accountId].type,
    proxiedAccountId: proxy.proxiedAccountId,
    proxiedWalletName: proxyUtils.getProxiedName(proxy.accountId, proxy.proxyType),
    read: false,
    type,
  }));
}
