import { combine } from 'effector';
import { createGate } from 'effector-react';

import { type ChainId, type ProxyAccount, type Wallet } from '@/shared/core';
import { keys, nullable } from '@/shared/lib/utils';
import { accountService, accounts } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { proxyModel, proxyUtils } from '@/entities/proxy';
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

const $chainsProxies = combine(
  {
    wallet: $wallet,
    chains: networkModel.$chains,
    proxies: proxyModel.$proxies,
    accounts: accounts.$list,
  },
  ({ wallet, chains, proxies, accounts }): Record<ChainId, ProxyAccount[]> => {
    if (nullable(wallet)) return {};

    const walletAccounts = accountService.filterAccountsByWallet(accounts, wallet.id);
    return proxyUtils.getProxyAccountsOnChain(walletAccounts, keys(chains), proxies);
  },
);

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
