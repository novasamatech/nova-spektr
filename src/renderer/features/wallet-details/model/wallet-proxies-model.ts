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
  Record<ChainId, (Omit<ProxyAccount, 'id' | 'delay'> & { deposit: string })[]>
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

    const fetchChainProxies = async (
      chainId: ChainId,
    ): Promise<[ChainId, (Omit<ProxyAccount, 'id' | 'delay'> & { deposit: string })[]]> => {
      const api = apis[chainId];
      const chain = chains[chainId];
      if (!api || !chain) return [chainId, []];

      if (!networkUtils.isProxySupported(chain.options)) {
        return [chainId, []];
      }

      const walletAccounts = accountService.filterAccountsByWallet(allAccounts, wallet.id);
      const accountProxiesPromises = walletAccounts.map(async account => {
        if (!accountService.isAccountAvailableOnChain(account, chain)) {
          return null;
        }

        try {
          const result = await proxyService.getProxiesForAccount(api, account.accountId);

          return result.accounts.map(proxy => ({
            accountId: proxy.accountId,
            proxiedAccountId: account.accountId,
            chainId,
            proxyType: proxy.proxyType,
            deposit: result.deposit,
          }));
        } catch (error) {
          console.log(`Failed to fetch proxies for account ${account.accountId} on chain ${chainId}:`, error);
          return [];
        }
      });

      const accountsProxies = await Promise.all(accountProxiesPromises);
      const allProxies = accountsProxies.flat().filter(nonNullable);
      const uniqueProxies = allProxies.reduce((acc, proxy) => {
        const key = `${proxy.accountId}_${proxy.proxiedAccountId}`;
        if (!acc.has(key)) {
          acc.set(key, proxy);
        }
        return acc;
      }, new Map<string, (typeof allProxies)[0]>());

      return [chainId, Array.from(uniqueProxies.values())];
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
  return Object.values(chainsProxies).some(accounts => accounts.length > 0);
});

const $walletProxiesCount = $walletProxies.map(chainsProxies => {
  return Object.values(chainsProxies).reduce((total, accounts) => total + accounts.length, 0);
});

sample({
  clock: $wallet,
  source: { wallet: $wallet },
  filter: ({ wallet }) => nonNullable(wallet),
  target: resetWalletProxies,
});

sample({
  clock: accountSync.syncAccounts.doneData,
  source: {
    wallet: $wallet,
    chains: networkModel.$chains,
    apis: networkModel.$apis,
  },
  filter: ({ wallet }) => nonNullable(wallet),
  fn: ({ wallet, chains, apis }) => ({ wallet: wallet!, chains, apis, allAccounts: [] }),
  target: _fetchWalletProxiesFx,
});
const $walletProxyGroups = combine(
  {
    wallet: $wallet,
    chainsProxies: $walletProxies,
  },
  ({ wallet, chainsProxies }) => {
    if (!wallet) return [];

    const groups = [];
    for (const [chainIdStr, proxyAccounts] of Object.entries(chainsProxies)) {
      if (proxyAccounts.length > 0) {
        const chainId = chainIdStr;
        const totalDeposit = proxyAccounts[0].deposit || '0';

        groups.push({
          chainId,
          proxiedAccountId: proxyAccounts[0].proxiedAccountId,
          walletId: wallet.id,
          totalDeposit: String(totalDeposit),
        });
      }
    }

    return groups;
  },
);

export const walletProxiesModel = {
  flow,
  $wallet,
  $walletProxies,
  $walletProxiesPending,
  $hasWalletProxies,
  $walletProxiesCount,
  $walletProxyGroups,
};
