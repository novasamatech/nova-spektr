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
import { type AnyAccount } from '@/domains/network';
import { proxyUtils } from '@/entities/proxy';
import { accountUtils, walletUtils } from '@/entities/wallet';

export const proxiesUtils = {
  isRegularProxy,
  isPureProxy,
  chainSupportProxy,
  getNotification,
  isProxiedAvailable,
};

function isRegularProxy(chain: Chain): boolean {
  return Boolean(chain.options?.includes(ChainOptions.REGULAR_PROXY));
}

function isPureProxy(chain: Chain): boolean {
  return Boolean(chain.options?.includes(ChainOptions.PURE_PROXY));
}

function chainSupportProxy(chain: Chain): boolean {
  return isRegularProxy(chain) || isPureProxy(chain);
}

type GetNotificationParams = {
  wallets: Wallet[];
  proxiedAccounts: PartialProxiedAccount[];
  chains: Record<ChainId, Chain>;
  type: NotificationType;
};
function getNotification({ wallets, proxiedAccounts, chains, type }: GetNotificationParams): NoID<ProxyAction>[] {
  const filteredWallets = walletUtils.getWalletsFilteredAccounts(wallets, {
    accountFn: (a) => proxiedAccounts.some((p) => p.connections.some((c) => c.proxyAccountId === a.accountId)),
  });

  if (!filteredWallets) return [];

  const accountsMap = filteredWallets.reduce<Record<AccountId, { name: string; type: WalletType }>>((acc, wallet) => {
    for (const account of wallet.accounts) {
      acc[account.accountId] = { name: wallet.name, type: wallet.type };
    }

    return acc;
  }, {});

  return proxiedAccounts
    .map((proxied) =>
      proxied.connections.map((connection) => {
        const addressPrefix = chains[proxied.chainId].addressPrefix;
        const proxyAccount = accountsMap[connection.proxyAccountId];

        return {
          chainId: proxied.chainId,
          dateCreated: Date.now(),
          proxyType: connection.proxyType,
          proxyAccountId: connection.proxyAccountId,
          proxyVariant: proxied.proxyVariant,
          proxyWalletName: proxyAccount.name,
          proxyWalletType: proxyAccount.type,
          proxiedAccountId: proxied.accountId,
          proxiedWalletName: proxyUtils.getProxiedName(proxied, addressPrefix),
          read: false,
          type,
        };
      }),
    )
    .flat();
}

function isProxiedAvailable(account: AnyAccount): boolean {
  return !accountUtils.isWatchOnlyAccount(account);
}
