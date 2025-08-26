import { attach, createEffect, createEvent, sample } from 'effector';

import {
  AccountType,
  type Chain,
  type ChainId,
  CryptoType,
  type NoID,
  NotificationType,
  type PartialProxiedAccount,
  type ProxiedAccount,
  type ProxiedWallet,
  SigningType,
  type Wallet,
  WalletType,
} from '@/shared/core';
import { series } from '@/shared/effector';
import { type IdentityMap, accounts, identity, identityService } from '@/domains/network';
import { balanceModel } from '@/entities/balance';
import { networkModel, networkUtils } from '@/entities/network';
import { notificationModel } from '@/entities/notification';
import { proxyUtils } from '@/entities/proxy';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { proxiesUtils } from '../lib/proxies-utils';

const proxiedAccountsRemoved = createEvent<ProxiedAccount[]>();
const proxiedAccountsUpdated = createEvent<ProxiedAccount[]>();

// Wallet management

type ProxiedWalletsParams = {
  identity: IdentityMap;
  proxiedAccount: PartialProxiedAccount;
  chains: Record<ChainId, Chain>;
  wallets: Wallet[];
};

const createProxiedWalletFx = createEffect(({ identity, proxiedAccount, chains, wallets }: ProxiedWalletsParams) => {
  const chain = chains[proxiedAccount.chainId];

  const walletIdentity = chain ? identity[chain.chainId]?.[proxiedAccount.accountId] : null;
  const proxyBasedName = proxyUtils.getProxiedName(proxiedAccount, chain.addressPrefix);

  const flexibleProxyWallet = walletUtils.getWalletFilteredAccounts(wallets, {
    walletFn: (w) => walletUtils.isFlexibleMultisig(w),
    accountFn: (a) =>
      accountUtils.isChainIdMatch(a, proxiedAccount.chainId) &&
      proxiedAccount.connections.some((c) => a.accountId === c.proxyAccountId),
  });

  const wallet: Omit<NoID<ProxiedWallet>, 'accounts'> = {
    name: walletIdentity ? identityService.getFullName(walletIdentity) : proxyBasedName,
    type: WalletType.PROXIED,
    isHidden: !!flexibleProxyWallet,
  };

  const isEthereumChain = networkUtils.isEthereumBased(chains[proxiedAccount.chainId].options);

  const accounts: Omit<NoID<ProxiedAccount>, 'walletId'>[] = [
    {
      ...proxiedAccount,
      type: 'chain',
      name: walletIdentity ? identityService.getFullName(walletIdentity) : proxyBasedName,
      accountType: AccountType.PROXIED,
      signingType: SigningType.WATCH_ONLY,
      cryptoType: isEthereumChain ? CryptoType.ETHEREUM : CryptoType.SR25519,
    },
  ];

  return { wallet, accounts };
});

const createProxiedWalletsFx = attach({
  source: {
    chains: networkModel.$chains,
    wallets: walletModel.$wallets,
    identity: identity.$list,
  },
  mapParams(proxiedAccounts: PartialProxiedAccount[], { chains, wallets, identity }) {
    return proxiedAccounts.map((proxiedAccount) => ({ identity, proxiedAccount, chains, wallets }));
  },
  effect: series(createProxiedWalletFx),
});

sample({
  clock: proxiedAccountsUpdated,
  target: accounts.updateAccounts,
});

sample({
  clock: proxiedAccountsRemoved,
  filter: (proxiedAccounts) => proxiedAccounts.length > 0,
  fn: (proxiedAccounts) => {
    return proxiedAccounts.map((p) => p.walletId);
  },
  target: walletModel.walletsRemoved,
});

sample({
  clock: proxiedAccountsRemoved,
  fn: (proxiedAccounts) => proxiedAccounts.map((p) => p.accountId),
  target: balanceModel.events.balancesRemoved,
});

sample({
  clock: createProxiedWalletsFx.doneData,
  target: series(walletModel.events.createProxied),
});

sample({
  clock: createProxiedWalletsFx.doneData,
  source: {
    chains: networkModel.$chains,
    wallets: walletModel.$wallets,
  },
  fn: ({ chains, wallets }, walletDrafts) => {
    const proxiedAccounts = walletDrafts.flatMap(({ accounts }) => accounts);

    return proxiesUtils.getNotification({
      wallets,
      proxiedAccounts,
      chains,
      type: NotificationType.PROXY_CREATED,
    });
  },
  target: notificationModel.events.notificationsAdded,
});

// TODO remove
export const proxiesModel = {
  createProxiedWalletsFx: createProxiedWalletsFx,
};
