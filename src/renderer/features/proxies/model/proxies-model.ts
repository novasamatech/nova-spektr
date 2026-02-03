import { attach, createEffect, createEvent, sample } from 'effector';

import {
  type Chain,
  type ChainId,
  type NoID,
  type PartialProxiedAccount,
  type ProxiedAccount,
  type ProxiedWallet,
  type Wallet,
  AccountType,
  CryptoType,
  SigningType,
  WalletType,
} from '@/shared/core';
import { series } from '@/shared/effector';
import { type IdentityMap, accounts, identity, identityService } from '@/domains/network';
import { networkModel, networkUtils } from '@/entities/network';
import { proxyUtils } from '@/entities/proxy';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';

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
  const proxyBasedName = proxyUtils.getProxiedName(proxiedAccount, chain?.addressPrefix);

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

  const isEthereumChain = chain ? networkUtils.isEthereumBased(chain.options) : false;

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
  clock: createProxiedWalletsFx.doneData,
  target: series(walletModel.events.createProxied),
});

// TODO remove
export const proxiesModel = {
  createProxiedWalletsFx: createProxiedWalletsFx,
};
