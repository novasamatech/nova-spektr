import {
  type Chain,
  type ChainId,
  ChainOptions,
  type NoID,
  type NotificationType,
  type PartialProxiedAccount,
  type ProxyAction,
  type Wallet,
  type WalletType,
} from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { proxyUtils } from '@/entities/proxy';
import { walletUtils } from '@/entities/wallet';

export const proxiesUtils = {
  isRegularProxy,
  isPureProxy,
  getNotification,
  isProxiedAvailable,
};

function isRegularProxy(chain: Chain): boolean {
  return Boolean(chain.options?.includes(ChainOptions.REGULAR_PROXY));
}

function isPureProxy(chain: Chain): boolean {
  return Boolean(chain.options?.includes(ChainOptions.PURE_PROXY));
}

type GetNotificationParams = {
  wallets: Wallet[];
  proxiedAccounts: PartialProxiedAccount[];
  chains: Record<ChainId, Chain>;
  type: NotificationType;
};
function getNotification({ wallets, proxiedAccounts, chains, type }: GetNotificationParams): NoID<ProxyAction>[] {
  const filteredWallets = walletUtils.getWalletsFilteredAccounts(wallets, {
    accountFn: (a) => proxiedAccounts.some((p) => p.proxyAccountId === a.accountId),
  });

  if (!filteredWallets) return [];

  const accountsMap = filteredWallets.reduce<Record<AccountId, { name: string; type: WalletType }>>((acc, wallet) => {
    for (const account of wallet.accounts) {
      acc[account.accountId] = { name: wallet.name, type: wallet.type };
    }

    return acc;
  }, {});

  return proxiedAccounts.map((proxied) => {
    const addressPrefix = chains[proxied.chainId].addressPrefix;

    return {
      chainId: proxied.chainId,
      dateCreated: Date.now(),
      proxyType: proxied.proxyType,
      proxyAccountId: proxied.proxyAccountId,
      proxyVariant: proxied.proxyVariant,
      proxyWalletName: accountsMap[proxied.proxyAccountId].name,
      proxyWalletType: accountsMap[proxied.proxyAccountId].type,
      proxiedAccountId: proxied.accountId,
      proxiedWalletName: proxyUtils.getProxiedName(proxied, addressPrefix),
      read: false,
      type,
    };
  });
}

function isProxiedAvailable(wallet?: Wallet): boolean {
  return !walletUtils.isWatchOnly(wallet) && !walletUtils.isProxied(wallet);
}
