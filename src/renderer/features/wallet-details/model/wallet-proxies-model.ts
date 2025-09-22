import { type ApiPromise } from '@polkadot/api';
import { combine, createEffect, createEvent, createStore, sample } from 'effector';
import { createGate } from 'effector-react';

import { proxyService } from '@/shared/api/proxy';
import { type Chain, type ChainId, type Wallet } from '@/shared/core';
import { type ProxyAccount } from '@/shared/core/types/proxy';
import { keys, nonNullable, toAccountId } from '@/shared/lib/utils';
import { accountService, accounts } from '@/domains/network';
import { networkModel, networkUtils } from '@/entities/network';
import { accountUtils } from '@/entities/wallet';

export const fetchWalletProxiesFx = createEffect(
  async ({
    wallet,
    chains,
    apis,
  }: {
    wallet: Wallet;
    chains: Record<ChainId, Chain>;
    apis: Record<ChainId, ApiPromise>;
  }): Promise<Record<ChainId, Omit<ProxyAccount, 'id' | 'delay'>[]>> => {
    const chainIds = keys(chains);

    const fetchChainProxies = async (chainId: ChainId): Promise<[ChainId, Omit<ProxyAccount, 'id' | 'delay'>[]]> => {
      const api = apis[chainId];
      const chain = chains[chainId];
      if (!api || !chain) return [chainId, []];

      if (!networkUtils.isProxySupported(chain.options)) {
        return [chainId, []];
      }

      const accountProxiesPromises = wallet.accounts.map(async account => {
        try {
          const result = await proxyService.getProxiesForAccount(api, account.accountId);

          return result.accounts.map(proxy => ({
            accountId: toAccountId(proxy.address),
            proxiedAccountId: account.accountId,
            chainId,
            proxyType: proxy.proxyType,
          }));
        } catch (error) {
          console.log(`Failed to fetch proxies for account ${account.accountId} on chain ${chainId}:`, error);
          return [];
        }
      });

      const accountsProxies = await Promise.all(accountProxiesPromises);
      return [chainId, accountsProxies.flat()];
    };

    const chainProxiesPromises = chainIds.map(fetchChainProxies);
    const chainProxiesResults = await Promise.all(chainProxiesPromises);

    return Object.fromEntries(chainProxiesResults);
  },
);

export const resetWalletProxies = createEvent();

export const $walletProxies = createStore<Record<ChainId, Omit<ProxyAccount, 'id' | 'delay'>[]>>({});

sample({
  clock: resetWalletProxies,
  target: $walletProxies.reinit!,
});

export const $hasWalletProxies = $walletProxies.map(chainsProxies => {
  return Object.values(chainsProxies).some(accounts => accounts.length > 0);
});

export const $walletProxiesCount = $walletProxies.map(chainsProxies => {
  return Object.values(chainsProxies).reduce((total, accounts) => total + accounts.length, 0);
});

const flow = createGate<{ wallet: Wallet | null }>({ defaultState: { wallet: null } });

const $wallet = flow.state.map(({ wallet }) => wallet);

sample({
  clock: $wallet,
  filter: nonNullable,
  target: resetWalletProxies,
});

sample({
  source: {
    wallet: $wallet,
    chains: networkModel.$chains,
    apis: networkModel.$apis,
  },
  filter: ({ wallet }) => nonNullable(wallet),
  fn: ({ wallet, chains, apis }) => ({ wallet: wallet!, chains, apis }),
  target: fetchWalletProxiesFx,
});

sample({
  clock: fetchWalletProxiesFx.doneData,
  target: $walletProxies,
});

const $walletProxyGroups = combine(
  {
    wallet: $wallet,
    chainsProxies: $walletProxies,
    accounts: accounts.$list,
  },
  ({ wallet, chainsProxies, accounts }) => {
    if (!wallet) return [];

    const walletAccounts = accountService.filterAccountsByWallet(accounts, wallet.id);
    const proxiedAccounts = walletAccounts.filter(accountUtils.isProxiedAccount);

    const initialGroups = proxiedAccounts.map(account => {
      return {
        chainId: account.chainId,
        proxiedAccountId: account.accountId,
        walletId: account.walletId,
        totalDeposit: String(account.deposit),
      };
    });

    if (initialGroups.length !== 0) {
      return initialGroups;
    }

    const derivedGroups = [];
    for (const [chainIdStr, proxyAccounts] of Object.entries(chainsProxies)) {
      if (proxyAccounts.length > 0) {
        const proxiedAccount = accounts.find(
          account => account.accountId === proxyAccounts[0].proxiedAccountId && accountUtils.isProxiedAccount(account),
        );

        derivedGroups.push({
          chainId: chainIdStr as ChainId,
          proxiedAccountId: proxyAccounts[0].proxiedAccountId,
          walletId: wallet.id,
          totalDeposit:
            proxiedAccount && accountUtils.isProxiedAccount(proxiedAccount) ? String(proxiedAccount.deposit) : '0',
        });
      }
    }
    return derivedGroups;
  },
);

export const walletProxiesModel = {
  flow,
  $wallet,
  fetchWalletProxiesFx,
  resetWalletProxies,
  $walletProxies,
  $hasWalletProxies,
  $walletProxiesCount,
  $walletProxyGroups,
};
