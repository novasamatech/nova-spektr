import { combine, sample } from 'effector';
import { createGate } from 'effector-react';

import { type ChainId, type Wallet } from '@/shared/core';
import { nullable } from '@/shared/lib/utils';
import { accountService, accounts } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { accountUtils, permissionUtils } from '@/entities/wallet';

import { walletProxiesModel } from './wallet-proxies-model';

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

sample({
  clock: $wallet,
  filter: wallet => !nullable(wallet),
  target: walletProxiesModel.resetWalletProxies,
});

sample({
  source: {
    wallet: $wallet,
    chains: networkModel.$chains,
    apis: networkModel.$apis,
  },
  filter: ({ wallet }) => !nullable(wallet),
  fn: ({ wallet, chains, apis }) => ({ wallet: wallet!, chains, apis }),
  target: walletProxiesModel.fetchWalletProxiesFx,
});

sample({
  clock: walletProxiesModel.fetchWalletProxiesFx.doneData,
  target: walletProxiesModel.$walletProxies,
});

const $walletProxyGroups = combine(
  {
    wallet: $wallet,
    chainsProxies: walletProxiesModel.$walletProxies,
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
        chainId: account.chainId,
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
            totalDeposit: proxiedAccount && 'deposit' in proxiedAccount ? String(proxiedAccount.deposit) : '0',
          });
        }
      }
      return derivedGroups;
    }

    return initialGroups;
  },
);

const $hasProxies = walletProxiesModel.$hasWalletProxies;
const $proxiesCount = walletProxiesModel.$walletProxiesCount;

export const walletDetailsModel = {
  flow,

  $wallet,
  $chainsProxies: walletProxiesModel.$walletProxies,
  $walletProxyGroups,
  $hasProxies,
  $proxiesCount,
  $canCreateProxy,
};
