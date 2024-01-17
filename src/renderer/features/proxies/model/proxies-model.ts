import { attach, createEffect, createEvent, createStore, sample, scopeBind } from 'effector';
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
  WalletsMap,
} from '@shared/core';
import { AccountType, ChainType, CryptoType, SigningType, WalletType, NotificationType } from '@shared/core';
import { isDisabled, networkModel } from '@entities/network';
import { accountUtils, walletModel } from '@entities/wallet';
import { proxyModel, proxyUtils } from '@entities/proxy';
import { balanceModel } from '@entities/balance';
import { notificationModel } from '@entities/notification';
import { proxiesUtils } from '../lib/proxies-utils';

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
  wallets: WalletsMap;
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
  ({ chainId, accounts, wallets, proxies, endpoint }: GetProxiesParams): Promise<GetProxiesResult> => {
    const proxiedAccounts = accounts.filter((a) => accountUtils.isProxiedAccount(a));

    const accountsForProxy = keyBy(accounts, 'accountId');
    const accountsForProxied = keyBy(
      accounts.filter((a) => proxiesUtils.isProxiedAvailable(a, wallets[a.walletId])),
      'accountId',
    );

    return endpoint.call.getProxies({
      chainId,
      accountsForProxy,
      accountsForProxied,
      proxiedAccounts,
      proxies,
    }) as Promise<GetProxiesResult>;
  },
);

const disconnectFx = createEffect(async ({ chainId, endpoint }: { chainId: ChainId; endpoint: Endpoint<any> }) => {
  await endpoint.call.disconnect(chainId);
});

type ProxiedWalletsParams = {
  proxiedAccounts: PartialProxiedAccount[];
  chains: Record<ChainId, Chain>;
};
type ProxiedWalletsResult = {
  wallet: Wallet;
  accounts: ProxiedAccount[];
};
const createProxiedWalletsFx = createEffect(
  ({ proxiedAccounts, chains }: ProxiedWalletsParams): ProxiedWalletsResult[] => {
    return proxiedAccounts.map((proxied) => {
      const walletName = proxyUtils.getProxiedName(
        proxied.accountId,
        proxied.proxyType,
        chains[proxied.chainId].addressPrefix,
      );
      const wallet = {
        name: walletName,
        type: WalletType.PROXIED,
        signingType: SigningType.WATCH_ONLY,
      } as Wallet;

      // TODO: use chain data, when ethereum chains support
      const accounts = [
        {
          ...proxied,
          name: walletName,
          type: AccountType.PROXIED,
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
    wallets: walletModel.$walletsMap,
    endpoint: $endpoint,
  },
  filter: ({ wallets, endpoint }) => Boolean(endpoint) && Boolean(wallets),
  fn: ({ accounts, wallets, proxies, endpoint }, chainId) => ({
    chainId,
    accounts: accounts.filter((a) => accountUtils.isChainIdMatch(a, chainId)),
    wallets: wallets!,
    proxies: Object.values(proxies).flat(),
    endpoint: endpoint!,
  }),
  target: getProxiesFx,
});

spread({
  source: getProxiesFx.doneData,
  targets: {
    proxiesToRemove: proxyModel.events.proxiesRemoved,
    proxiesToAdd: proxyModel.events.proxiesAdded,
    proxiedAccountsToRemove: proxiedAccountsRemoved,
    proxiedAccountsToAdd: attach({
      source: networkModel.$chains,
      effect: createProxiedWalletsFx,
      mapParams: (proxiedAccounts: ProxiedAccount[], chains) => {
        return { proxiedAccounts, chains };
      },
    }),
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
    chains: networkModel.$chains,
  },
  filter: (_, data) => data.proxiedAccountsToAdd.length > 0,
  fn: ({ wallets, accounts, chains }, data) =>
    proxiesUtils.getNotification({
      wallets,
      accounts,
      chains,
      proxiedAccounts: data.proxiedAccountsToAdd,
      type: NotificationType.PROXY_CREATED,
    }),
  target: notificationModel.events.notificationsAdded,
});

sample({
  clock: getProxiesFx.doneData,
  source: {
    wallets: walletModel.$wallets,
    accounts: walletModel.$accounts,
    chains: networkModel.$chains,
  },
  filter: (_, data) => data.proxiedAccountsToRemove.length > 0,
  fn: ({ wallets, accounts, chains }, data) =>
    proxiesUtils.getNotification({
      wallets,
      accounts,
      chains,
      proxiedAccounts: data.proxiedAccountsToRemove,
      type: NotificationType.PROXY_REMOVED,
    }),
  target: notificationModel.events.notificationsAdded,
});

export const proxiesModel = {
  events: {
    workerStarted,
  },
};
