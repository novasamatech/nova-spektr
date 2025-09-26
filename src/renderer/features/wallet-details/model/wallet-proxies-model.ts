import { type ApiPromise } from '@polkadot/api';
import { combine, createEffect, createEvent, createStore, sample } from 'effector';
import { createGate } from 'effector-react';

import { type Chain, type ChainId, type Wallet } from '@/shared/core';
import { type ProxyAccount, type ProxyType } from '@/shared/core/types/proxy';
import { nonNullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { createSubscriptionResource, deriveFromResources } from '@/shared/resource';
import { type AnyAccount, accountService, accountSync, accounts } from '@/domains/network';
import { networkModel, networkUtils } from '@/entities/network';

export type Proxy = Omit<ProxyAccount, 'id' | 'delay'>;
type ChainProxies = { proxies: Proxy[]; deposit: string | null };
type WalletProxiesByChain = Record<ChainId, ChainProxies>;

const flow = createGate<{ wallet: Wallet | null }>({ defaultState: { wallet: null } });

const $wallet = flow.state.map(({ wallet }) => wallet);

type WalletProxiesSubscriptionParams = {
  api: ApiPromise;
  chain: Chain;
  wallet: Wallet;
  allAccounts: AnyAccount[];
};

const walletProxiesSubscription = createSubscriptionResource<WalletProxiesSubscriptionParams, ChainProxies>({
  name: 'walletProxiesSubscription',
  pool: ({ chain, wallet }) => `${chain.chainId}_${wallet.id}`,
  async fn({ api, chain, wallet, allAccounts }, callback) {
    if (!networkUtils.isProxySupported(chain.options)) {
      callback({ done: true, value: { proxies: [], deposit: null } });
      return () => {};
    }

    const walletAccounts = accountService.filterAccountsByWallet(allAccounts, wallet.id);
    const availableAccounts = walletAccounts.filter(account =>
      accountService.isAccountAvailableOnChain(account, chain),
    );

    if (availableAccounts.length === 0) {
      callback({ done: true, value: { proxies: [], deposit: null } });
      return () => {};
    }

    const accountIds = availableAccounts.map(account => account.accountId);

    return api.query.proxy.proxies.multi(accountIds, proxiesData => {
      const allProxies: Proxy[] = [];
      let deposit: string | null = null;

      for (let i = 0; i < accountIds.length; i++) {
        const account = accountIds[i];
        const data = proxiesData[i];

        try {
          const [proxies, depositBalance] = data;

          const mappedProxies = proxies.map(proxy => ({
            accountId: proxy.delegate.toString() as AccountId,
            proxiedAccountId: account,
            chainId: chain.chainId,
            proxyType: proxy.proxyType.toString() as ProxyType,
          }));

          allProxies.push(...mappedProxies);

          if (!deposit) {
            deposit = depositBalance.toString();
          }
        } catch (error) {
          console.error(`Failed to fetch proxies for account ${account} on chain ${chain.chainId}:`, error);
        }
      }

      callback({ done: true, value: { proxies: allProxies, deposit } });
    });
  },
});

const $walletProxies = createStore<WalletProxiesByChain>({});
const $isProxiesLoading = createStore(true);

deriveFromResources({
  store: $walletProxies,
  resources: [walletProxiesSubscription],
  map(state, chainProxies, { chain }) {
    return {
      ...state,
      [chain.chainId]: chainProxies,
    };
  },
});

sample({
  clock: walletProxiesSubscription.push,
  fn: () => false,
  target: $isProxiesLoading,
});

const subscribeToChainsFx = createEffect(
  ({
    wallet,
    chains,
    apis,
    allAccounts,
  }: {
    wallet: Wallet;
    chains: Record<ChainId, Chain>;
    apis: Record<ChainId, ApiPromise>;
    allAccounts: AnyAccount[];
  }) => {
    for (const [chainId, chain] of Object.entries(chains)) {
      const api = apis[chainId as ChainId];
      if (api) {
        walletProxiesSubscription.subscribe({
          api,
          chain,
          wallet,
          allAccounts,
        });
      }
    }
  },
);

sample({
  clock: combine({
    wallet: $wallet,
    chains: networkModel.$chains,
    apis: networkModel.$apis,
    allAccounts: accounts.$list,
  }),
  filter: ({ wallet, chains, apis }) =>
    nonNullable(wallet) && Object.keys(chains).length > 0 && Object.keys(apis).length > 0,
  fn: ({ wallet, chains, apis, allAccounts }) => ({
    wallet: wallet!,
    chains,
    apis,
    allAccounts,
  }),
  target: subscribeToChainsFx,
});

export const resetWalletProxies = createEvent();

const $hasWalletProxies = $walletProxies.map(chainsProxies => {
  return Object.values(chainsProxies).some(chainProxies => chainProxies.proxies.length > 0);
});

const $walletProxiesCount = $walletProxies.map(chainsProxies => {
  return Object.values(chainsProxies).reduce((total, chainProxies) => total + chainProxies.proxies.length, 0);
});

sample({
  clock: resetWalletProxies,
  fn: () => ({}),
  target: $walletProxies,
});

sample({
  clock: resetWalletProxies,
  target: walletProxiesSubscription.unsubscribe,
});

sample({
  clock: resetWalletProxies,
  fn: () => true,
  target: $isProxiesLoading,
});

const $walletProxyGroups = combine(
  {
    wallet: $wallet,
    chainsProxies: $walletProxies,
  },
  ({ wallet, chainsProxies }) => {
    if (!wallet) return [];

    const groups = [];
    for (const [chainIdStr, chainProxies] of Object.entries(chainsProxies)) {
      if (chainProxies.proxies.length > 0) {
        const chainId = chainIdStr;
        const totalDeposit = chainProxies.deposit;

        groups.push({
          chainId,
          proxiedAccountId: chainProxies.proxies[0].proxiedAccountId,
          walletId: wallet.id,
          totalDeposit: totalDeposit ? String(totalDeposit) : null,
        });
      }
    }

    return groups;
  },
);

const $isLoading = combine(
  {
    isProxiesLoading: $isProxiesLoading,
    isAccountSyncPending: accountSync.syncAccounts.pending,
  },
  ({ isProxiesLoading, isAccountSyncPending }) => isProxiesLoading || isAccountSyncPending,
);

export const walletProxiesModel = {
  flow,
  $wallet,
  $walletProxies,
  $hasWalletProxies,
  $walletProxiesCount,
  $walletProxyGroups,
  $isLoading,
};
