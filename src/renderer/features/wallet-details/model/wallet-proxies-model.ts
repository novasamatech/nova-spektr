import { type ApiPromise } from '@polkadot/api';
import { combine } from 'effector';
import { createGate } from 'effector-react';

import { proxyService } from '@/shared/api/proxy';
import { type Chain, type ChainId, type Wallet } from '@/shared/core';
import { type ProxyAccount } from '@/shared/core/types/proxy';
import { createStoreFromEffect } from '@/shared/effector';
import { entries, keys, nonNullable, nullable } from '@/shared/lib/utils';
import { type AnyAccount, accountService, accounts } from '@/domains/network';
import { networkModel, networkUtils } from '@/entities/network';
import { accountUtils } from '@/entities/wallet';

const flow = createGate<{ wallet: Wallet | null }>({ defaultState: { wallet: null } });

const $wallet = flow.state.map(({ wallet }) => wallet);

const { $: $walletProxies } = createStoreFromEffect<
  {
    wallet: Wallet;
    chains: Record<ChainId, Chain>;
    allAccounts: AnyAccount[];
    apis: Record<ChainId, ApiPromise>;
  },
  Record<ChainId, Omit<ProxyAccount, 'id' | 'delay'>[]>
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

    const fetchChainProxies = async (chainId: ChainId): Promise<[ChainId, Omit<ProxyAccount, 'id' | 'delay'>[]]> => {
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
          }));
        } catch (error) {
          console.log(`Failed to fetch proxies for account ${account.accountId} on chain ${chainId}:`, error);
          return [];
        }
      });

      const accountsProxies = await Promise.all(accountProxiesPromises);
      return [chainId, accountsProxies.flat().filter(nonNullable)];
    };

    const chainProxiesPromises = chainIds.map(fetchChainProxies);
    const chainProxiesResults = await Promise.allSettled(chainProxiesPromises).then(results =>
      results.filter(r => r.status === 'fulfilled').map(r => r.value),
    );

    return Object.fromEntries(chainProxiesResults);
  },
});

const $hasWalletProxies = $walletProxies.map(chainsProxies => {
  return Object.values(chainsProxies).some(accounts => accounts.length > 0);
});

const $walletProxiesCount = $walletProxies.map(chainsProxies => {
  return Object.values(chainsProxies).reduce((total, accounts) => total + accounts.length, 0);
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
        totalDeposit: account.deposit,
      };
    });

    if (initialGroups.length !== 0) {
      return initialGroups;
    }

    const derivedGroups: { chainId: ChainId; proxiedAccountId: string; walletId: number; totalDeposit: string }[] = [];
    for (const [chainId, proxyAccounts] of entries(chainsProxies)) {
      if (proxyAccounts.length > 0) {
        const proxiedAccountId = proxyAccounts[0].proxiedAccountId;
        if (nullable(proxiedAccountId)) continue;

        const proxiedAccount = accounts.find(
          account => account.accountId === proxiedAccountId && accountUtils.isProxiedAccount(account),
        );

        derivedGroups.push({
          chainId,
          proxiedAccountId,
          walletId: wallet.id,
          totalDeposit: proxiedAccount && accountUtils.isProxiedAccount(proxiedAccount) ? proxiedAccount.deposit : '0',
        });
      }
    }
    return derivedGroups;
  },
);

export const walletProxiesModel = {
  flow,
  $wallet,
  $walletProxies,
  $hasWalletProxies,
  $walletProxiesCount,
  $walletProxyGroups,
};
