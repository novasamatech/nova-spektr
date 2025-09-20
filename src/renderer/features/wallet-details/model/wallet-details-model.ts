import { type ApiPromise } from '@polkadot/api';
import { combine, createEffect, createStore, sample } from 'effector';
import { createGate } from 'effector-react';

import { proxyService } from '@/shared/api/proxy';
import { type Chain, type ChainId, type ProxyAccount, type Wallet } from '@/shared/core';
import { keys, nullable, toAccountId } from '@/shared/lib/utils';
import { accountService, accounts } from '@/domains/network';
import { networkModel, networkUtils } from '@/entities/network';
import { accountUtils, permissionUtils } from '@/entities/wallet';

const flow = createGate<{ wallet: Wallet | null }>({ defaultState: { wallet: null } });

const $wallet = flow.state.map(({ wallet }) => wallet);

const $canCreateProxy = combine(
  {
    wallet: $wallet,
    accounts: accounts.$list,
  },
  ({ wallet, accounts }) => {
    if (nullable(wallet)) return false;

    const walletAccounts = accountService.filterAccountsByWallet(accounts, wallet.id);
    if (walletAccounts.length === 0) return false;

    const canCreateAnyProxy = permissionUtils.canCreateAnyProxy(wallet);
    const canCreateNonAnyProxy = permissionUtils.canCreateNonAnyProxy(wallet);

    return canCreateAnyProxy || canCreateNonAnyProxy;
  },
);

const fetchAllProxiesFx = createEffect(
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

      // Skip chains that don't support proxy functionality
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

const $chainsProxies = createStore<Record<ChainId, Omit<ProxyAccount, 'id' | 'delay'>[]>>({});

sample({
  source: {
    wallet: $wallet,
    chains: networkModel.$chains,
    apis: networkModel.$apis,
  },
  filter: ({ wallet }) => !nullable(wallet),
  fn: ({ wallet, chains, apis }) => ({ wallet: wallet!, chains, apis }),
  target: fetchAllProxiesFx,
});

sample({
  clock: fetchAllProxiesFx.doneData,
  target: $chainsProxies,
});

const $walletProxyGroups = combine(
  {
    wallet: $wallet,
    chainsProxies: $chainsProxies,
    accounts: accounts.$list,
  },
  ({
    wallet,
    chainsProxies,
    accounts,
  }): {
    chainId: ChainId;
    proxiedAccountId: string;
    walletId: number;
    totalDeposit: string;
  }[] => {
    if (nullable(wallet)) return [];

    const walletAccounts = accountService.filterAccountsByWallet(accounts, wallet.id);
    const proxiedAccounts = walletAccounts.filter(accountUtils.isProxiedAccount);

    const initialGroups = proxiedAccounts.map(account => {
      return {
        chainId: account.chainId as ChainId,
        proxiedAccountId: account.accountId,
        walletId: account.walletId,
        totalDeposit: String(account.deposit),
      };
    });

    if (initialGroups.length === 0) {
      const derivedGroups = [];
      for (const [chainIdStr, proxyAccounts] of Object.entries(chainsProxies)) {
        if (proxyAccounts.length > 0) {
          const proxiedAccount = accounts.find(
            account =>
              account.accountId === proxyAccounts[0].proxiedAccountId && accountUtils.isProxiedAccount(account),
          );

          derivedGroups.push({
            chainId: chainIdStr as ChainId,
            proxiedAccountId: proxyAccounts[0].proxiedAccountId,
            walletId: wallet.id,
            totalDeposit: String(proxiedAccount && 'deposit' in proxiedAccount ? proxiedAccount.deposit : 'N/A'),
          });
        }
      }
      return derivedGroups;
    }

    return initialGroups;
  },
);

const $hasProxies = combine($chainsProxies, chainsProxies => {
  return Object.values(chainsProxies).some(accounts => accounts.length > 0);
});

const $proxiesCount = combine($chainsProxies, chainsProxies => {
  return Object.values(chainsProxies).reduce((acc, accounts) => acc + accounts.length, 0);
});

export const walletDetailsModel = {
  flow,

  $wallet,
  $chainsProxies,
  $walletProxyGroups,
  $hasProxies,
  $proxiesCount,
  $canCreateProxy,
};
