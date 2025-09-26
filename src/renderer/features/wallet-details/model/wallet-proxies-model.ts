import { type ApiPromise } from '@polkadot/api';
import { combine, createEvent, sample } from 'effector';
import { createGate } from 'effector-react';

import { proxyService } from '@/shared/api/proxy';
import { type Chain, type ChainId, type Wallet } from '@/shared/core';
import { type ProxyAccount } from '@/shared/core/types/proxy';
import { createStoreFromEffect } from '@/shared/effector';
import { keys, nonNullable } from '@/shared/lib/utils';
import { type AnyAccount, accountService, accountSync, accounts } from '@/domains/network';
import { networkModel, networkUtils } from '@/entities/network';

export type Proxy = Omit<ProxyAccount, 'id' | 'delay'>;
type ChainProxies = { proxies: Proxy[]; deposit: string | null };
type WalletProxiesByChain = Record<ChainId, ChainProxies>;

const flow = createGate<{ wallet: Wallet | null }>({ defaultState: { wallet: null } });

const $wallet = flow.state.map(({ wallet }) => wallet);

const {
  $: $walletProxies,
  fx: _fetchWalletProxiesFx,
  $pending: $walletProxiesPending,
} = createStoreFromEffect<
  {
    wallet: Wallet;
    chains: Record<ChainId, Chain>;
    allAccounts: AnyAccount[];
    apis: Record<ChainId, ApiPromise>;
  },
  WalletProxiesByChain
>({
  defaultValue: {},
  params: {
    wallet: $wallet,
    allAccounts: accounts.$list,
    chains: networkModel.$chains,
    apis: networkModel.$apis,
  },
  async fn({ wallet, chains, apis, allAccounts }) {
    const chainIds = keys(chains);

    const fetchChainProxies = async (chainId: ChainId): Promise<[ChainId, ChainProxies]> => {
      const api = apis[chainId];
      const chain = chains[chainId];
      if (!api || !chain) return [chainId, { proxies: [], deposit: null }];

      if (!networkUtils.isProxySupported(chain.options)) {
        return [chainId, { proxies: [], deposit: null }];
      }

      const walletAccounts = accountService.filterAccountsByWallet(allAccounts, wallet.id);
      const accountProxiesPromises = walletAccounts.map(async account => {
        if (!accountService.isAccountAvailableOnChain(account, chain)) {
          return null;
        }

        try {
          const result = await proxyService.getProxiesForAccount(api, account.accountId);

          return {
            proxies: result.accounts.map(proxy => ({
              accountId: proxy.accountId,
              proxiedAccountId: account.accountId,
              chainId,
              proxyType: proxy.proxyType,
            })),
            deposit: result.deposit,
          };
        } catch (error) {
          console.log(`Failed to fetch proxies for account ${account.accountId} on chain ${chainId}:`, error);
          return { proxies: [], deposit: null };
        }
      });

      const accountsProxies = await Promise.all(accountProxiesPromises);
      const validResults = accountsProxies.filter(nonNullable);

      if (validResults.length === 0) {
        return [chainId, { proxies: [], deposit: null }];
      }

      const allProxies = validResults.flatMap(result => result.proxies);
      const uniqueProxies = allProxies.reduce((acc, proxy) => {
        const key = `${proxy.accountId}_${proxy.proxiedAccountId}_${proxy.proxyType}`;
        if (!acc.has(key)) {
          acc.set(key, proxy);
        }
        return acc;
      }, new Map<string, Proxy>());

      const deposit = validResults[0].deposit;

      return [chainId, { proxies: Array.from(uniqueProxies.values()), deposit }];
    };

    const chainProxiesPromises = chainIds.map(fetchChainProxies);
    const chainProxiesResults = await Promise.allSettled(chainProxiesPromises).then(results =>
      results.filter(r => r.status === 'fulfilled').map(r => r.value),
    );

    return Object.fromEntries(chainProxiesResults);
  },
});

export const resetWalletProxies = createEvent();

const $hasWalletProxies = $walletProxies.map(chainsProxies => {
  return Object.values(chainsProxies).some(chainProxies => chainProxies.proxies.length > 0);
});

const $walletProxiesCount = $walletProxies.map(chainsProxies => {
  return Object.values(chainsProxies).reduce((total, chainProxies) => total + chainProxies.proxies.length, 0);
});

sample({
  clock: $wallet,
  source: { wallet: $wallet },
  filter: ({ wallet }) => nonNullable(wallet),
  target: resetWalletProxies,
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
    isProxiesLoading: $walletProxiesPending,
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
