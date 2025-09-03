import { combine } from 'effector';
import { createGate } from 'effector-react';

import { type ChainId, type ProxyAccount, type Wallet } from '@/shared/core';
import { keys, nullable } from '@/shared/lib/utils';
import { networkModel } from '@/entities/network';
import { proxyModel, proxyUtils } from '@/entities/proxy';
import { accountUtils, permissionUtils } from '@/entities/wallet';

const flow = createGate<{ wallet: Wallet | null }>({ defaultState: { wallet: null } });

const $wallet = flow.state.map(({ wallet }) => wallet);

const $canCreateProxy = $wallet.map(wallet => {
  if (nullable(wallet) || wallet.accounts.length === 0) return false;

  const canCreateAnyProxy = permissionUtils.canCreateAnyProxy(wallet);
  const canCreateNonAnyProxy = permissionUtils.canCreateNonAnyProxy(wallet);

  return canCreateAnyProxy || canCreateNonAnyProxy;
});

const $chainsProxies = combine(
  {
    wallet: $wallet,
    chains: networkModel.$chains,
    proxies: proxyModel.$proxies,
  },
  ({ wallet, chains, proxies }): Record<ChainId, ProxyAccount[]> => {
    if (nullable(wallet)) return {};

    return proxyUtils.getProxyAccountsOnChain(wallet.accounts, keys(chains), proxies);
  },
);

const $walletProxyGroups = $wallet.map(wallet => {
  if (nullable(wallet)) return [];

  return wallet.accounts.filter(accountUtils.isAnyProxied).map(account => {
    return {
      chainId: account.chainId,
      proxiedAccountId: account.accountId,
      walletId: account.walletId,
      totalDeposit: account.deposit,
    };
  });
});

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
