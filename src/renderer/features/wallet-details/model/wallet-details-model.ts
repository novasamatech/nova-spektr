import { combine } from 'effector';
import { createGate } from 'effector-react';

import { type ChainId, type ProxyAccount, type ProxyGroup, type Wallet } from '@/shared/core';
import { nullable } from '@/shared/lib/utils';
import { networkModel } from '@/entities/network';
import { proxyModel, proxyUtils } from '@/entities/proxy';
import { permissionUtils, walletUtils } from '@/entities/wallet';
import { walletDetailsUtils } from '../lib/utils';

const flow = createGate<{ wallet: Wallet | null }>({ defaultState: { wallet: null } });

const $wallet = flow.state.map(({ wallet }) => wallet);

const $multiShardAccounts = $wallet.map(wallet => {
  if (nullable(wallet) || !walletUtils.isMultiShard(wallet)) return new Map();

  return walletDetailsUtils.getMultishardMap(wallet.rootAccountId, wallet.accounts);
});

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

    return proxyUtils.getProxyAccountsOnChain(wallet.accounts, Object.keys(chains) as ChainId[], proxies);
  },
);

const $walletProxyGroups = combine(
  {
    wallet: $wallet,
    chainsProxies: $chainsProxies,
    groups: proxyModel.$walletsProxyGroups,
  },
  ({ wallet, groups }): ProxyGroup[] => {
    if (nullable(wallet) || nullable(groups[wallet.id])) return [];

    // TODO: Find why it can be doubled sometimes https://github.com/novasamatech/nova-spektr/issues/1655
    const walletGroups = groups[wallet.id];
    const filteredGroups = walletGroups.reduceRight(
      (acc, group) => {
        const id = `${group.chainId}_${group.proxiedAccountId}_${group.walletId}`;

        if (!acc[id]) {
          acc[id] = group;
        }

        return acc;
      },
      {} as Record<string, ProxyGroup>,
    );

    return Object.values(filteredGroups);
  },
);

const $hasProxies = combine($chainsProxies, chainsProxies => {
  return Object.values(chainsProxies).some(accounts => accounts.length > 0);
});

export const walletDetailsModel = {
  flow,

  $multiShardAccounts,

  $chainsProxies,
  $walletProxyGroups,
  $hasProxies,
  $canCreateProxy,
};
