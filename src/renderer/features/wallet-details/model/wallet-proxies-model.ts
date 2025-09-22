import { type ApiPromise } from '@polkadot/api';
import { createEffect, createEvent, createStore, sample } from 'effector';

import { proxyService } from '@/shared/api/proxy';
import { type Chain, type ChainId, type Wallet } from '@/shared/core';
import { type ProxyAccount } from '@/shared/core/types/proxy';
import { keys, toAccountId } from '@/shared/lib/utils';
import { networkUtils } from '@/entities/network';

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

export const walletProxiesModel = {
  fetchWalletProxiesFx,
  resetWalletProxies,
  $walletProxies,
  $hasWalletProxies,
  $walletProxiesCount,
};
