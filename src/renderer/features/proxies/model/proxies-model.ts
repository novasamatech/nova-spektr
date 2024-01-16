import { createEffect, createEvent, createStore, sample, scopeBind } from 'effector';
import { Endpoint, createEndpoint } from '@remote-ui/rpc';
import { keyBy } from 'lodash';
import { once, spread } from 'patronum';

import type {
  Account,
  AccountId,
  Chain,
  ChainId,
  Connection,
  NoID,
  PartialProxiedAccount,
  ProxiedAccount,
  ProxyAccount,
  ProxyGroup,
  ProxyDeposits,
  Wallet,
} from '@shared/core';
import { AccountType, ChainType, CryptoType, SigningType, WalletType, NotificationType } from '@shared/core';
import { isDisabled, networkModel } from '@entities/network';
import { accountUtils, walletModel } from '@entities/wallet';
import { proxyModel, proxyUtils } from '@entities/proxy';
import { balanceModel } from '@entities/balance';
import { notificationModel } from '@entities/notification';
import { proxiesUtils } from '../lib/utils';

const workerStarted = createEvent();
const connected = createEvent<ChainId>();
const proxiedAccountsRemoved = createEvent<ProxiedAccount[]>();
const depositsReceived = createEvent<ProxyDeposits>();

const $endpoint = createStore<Endpoint<any> | null>(null);

const startWorkerFx = createEffect(() => {
  // @ts-ignore
  const worker = new Worker(new URL('@features/proxies/workers/proxy-worker', import.meta.url));

  return createEndpoint(worker, {
    callable: ['initConnection', 'getProxies', 'disconnect'],
  });
});

type StartChainsProps = {
  chains: Chain[];
  connections: Record<ChainId, Connection>;
  endpoint: Endpoint<any>;
};
const startChainsFx = createEffect(({ chains, connections, endpoint }: StartChainsProps) => {
  const boundConnected = scopeBind(connected, { safe: true });

  chains.forEach((chain) => {
    if (isDisabled(connections[chain.chainId])) return;

    endpoint.call.initConnection(chain, connections[chain.chainId]).then(() => {
      boundConnected(chain.chainId);
    });
  });
});

type GetProxiesParams = {
  chainId: ChainId;
  accounts: Account[];
  proxies: ProxyAccount[];
  endpoint: Endpoint<any>;
};
type GetProxiesResult = {
  proxiesToAdd: ProxyAccount[];
  proxiesToRemove: ProxyAccount[];
  proxiedAccountsToAdd: PartialProxiedAccount[];
  proxiedAccountsToRemove: ProxiedAccount[];
  deposits: {
    chainId: ChainId;
    deposits: Record<AccountId, string>;
  };
};
const getProxiesFx = createEffect(
  ({ chainId, accounts, proxies, endpoint }: GetProxiesParams): Promise<GetProxiesResult> => {
    const proxiedAccounts = accounts.filter((a) => accountUtils.isProxiedAccount(a));
    const nonProxiedAccounts = keyBy(
      accounts.filter((a) => !accountUtils.isProxiedAccount(a)),
      'accountId',
    );

    return endpoint.call.getProxies(chainId, nonProxiedAccounts, proxiedAccounts, proxies) as Promise<GetProxiesResult>;
  },
);

const disconnectFx = createEffect(async ({ chainId, endpoint }: { chainId: ChainId; endpoint: Endpoint<any> }) => {
  await endpoint.call.disconnect(chainId);
});

const createProxiedWalletsFx = createEffect(
  (proxiedAccounts: PartialProxiedAccount[]): { wallet: Wallet; accounts: ProxiedAccount[] }[] => {
    return proxiedAccounts.map((proxied) => {
      const walletName = proxyUtils.getProxiedName(proxied.accountId, proxied.proxyType);
      const wallet = {
        name: walletName,
        type: WalletType.PROXIED,
        signingType: SigningType.WATCH_ONLY,
      } as Wallet;

      const accounts = [
        {
          ...proxied,
          name: walletName,
          type: AccountType.PROXIED,
          // TODO: use chain data, when ethereum chains support
          chainType: ChainType.SUBSTRATE,
          cryptoType: CryptoType.SR25519,
        } as ProxiedAccount,
      ];

      return { wallet, accounts };
    });
  },
);

sample({
  clock: workerStarted,
  target: startWorkerFx,
});

sample({
  clock: startWorkerFx.doneData,
  target: $endpoint,
});

sample({
  clock: [startWorkerFx.done, once(networkModel.$connections)],
  source: {
    connections: networkModel.$connections,
    chains: networkModel.$chains,
    endpoint: $endpoint,
  },
  filter: ({ endpoint }) => Boolean(endpoint),
  fn: ({ connections, chains, endpoint }) => ({
    chains: Object.values(chains).filter(proxiesUtils.isRegularProxy),
    connections,
    endpoint: endpoint!,
  }),
  target: startChainsFx,
});

sample({
  clock: connected,
  source: {
    accounts: walletModel.$accounts,
    proxies: proxyModel.$proxies,
    endpoint: $endpoint,
  },
  filter: ({ endpoint }) => Boolean(endpoint),
  fn: ({ accounts, proxies, endpoint }, chainId) => ({
    chainId,
    accounts: accounts.filter((a) => accountUtils.isChainIdMatch(a, chainId)),
    proxies: Object.values(proxies).flat(),
    endpoint: endpoint!,
  }),
  target: getProxiesFx,
});

spread({
  source: getProxiesFx.doneData,
  targets: {
    proxiesToAdd: proxyModel.events.proxiesAdded,
    proxiesToRemove: proxyModel.events.proxiesRemoved,
    proxiedAccountsToAdd: createProxiedWalletsFx,
    proxiedAccountsToRemove: proxiedAccountsRemoved,
    deposits: depositsReceived,
  },
});

sample({
  clock: createProxiedWalletsFx.doneData,
  target: walletModel.events.proxiedWalletsCreated,
});

sample({
  clock: proxiedAccountsRemoved,
  fn: (proxiedAccounts) => proxiedAccounts.map((p) => p.walletId),
  target: walletModel.events.walletsRemoved,
});

sample({
  clock: proxiedAccountsRemoved,
  fn: (proxiedAccounts) => proxiedAccounts.map((p) => p.accountId),
  target: balanceModel.events.accountsBalancesRemoved,
});

sample({
  clock: getProxiesFx.done,
  source: $endpoint,
  filter: (endpoint) => Boolean(endpoint),
  fn: (endpoint, { params: { chainId } }) => ({ chainId, endpoint: endpoint! }),
  target: disconnectFx,
});

sample({
  clock: depositsReceived,
  source: {
    wallets: walletModel.$wallets,
    accounts: walletModel.$accounts,
    groups: proxyModel.$proxyGroups,
  },
  fn: ({ wallets, accounts, groups }, deposits) => {
    const proxyGroups = proxyUtils.getProxyGroups(wallets, accounts, deposits);

    const { toAdd, toUpdate } = groups.reduce<Record<'toAdd' | 'toUpdate', NoID<ProxyGroup>[]>>(
      (acc, g) => {
        const shouldAddAll = proxyGroups.every((p) => proxyUtils.isSameProxyGroup(p, g));

        if (shouldAddAll) {
          acc.toAdd.push(g);
        } else {
          acc.toUpdate.push(g);
        }

        return acc;
      },
      { toAdd: [], toUpdate: [] },
    );

    const toRemove = groups.filter((p) => {
      if (p.chainId !== deposits.chainId) return false;

      return !proxyGroups.some((g) => proxyUtils.isSameProxyGroup(g, p));
    });

    return { toAdd, toUpdate, toRemove };
  },
  target: spread({
    toAdd: proxyModel.events.proxyGroupsAdded,
    toUpdate: proxyModel.events.proxyGroupsUpdated,
    toRemove: proxyModel.events.proxyGroupsRemoved,
  }),
});

sample({
  clock: getProxiesFx.doneData,
  source: {
    wallets: walletModel.$wallets,
    accounts: walletModel.$accounts,
  },
  filter: (_, data) => data.proxiedAccountsToAdd.length > 0,
  fn: ({ wallets, accounts }, data) =>
    proxiesUtils.getNotification(data.proxiedAccountsToAdd, wallets, accounts, NotificationType.PROXY_CREATED),
  target: notificationModel.events.notificationsAdded,
});

sample({
  clock: getProxiesFx.doneData,
  source: {
    wallets: walletModel.$wallets,
    accounts: walletModel.$accounts,
  },
  filter: (_, data) => data.proxiedAccountsToRemove.length > 0,
  fn: ({ wallets, accounts }, data) =>
    proxiesUtils.getNotification(data.proxiedAccountsToRemove, wallets, accounts, NotificationType.PROXY_REMOVED),
  target: notificationModel.events.notificationsAdded,
});

export const proxiesModel = {
  events: {
    workerStarted,
  },
};
