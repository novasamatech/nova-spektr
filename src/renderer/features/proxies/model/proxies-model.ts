import { createEffect, createEvent, sample, scopeBind } from 'effector';
import { createEndpoint } from '@remote-ui/rpc';
import { keyBy } from 'lodash';
import { once, spread } from 'patronum';

import { Account, Chain, ChainId, Connection, ProxyAccount, NotificationType } from '@shared/core';
import { isDisabled, networkModel } from '@entities/network';
import { proxyWorkerUtils } from '../lib/utils';
import { accountUtils, walletModel } from '@entities/wallet';
import { proxyModel } from '@entities/proxy';
import { notificationModel } from '@entities/notification';

// @ts-ignore
const worker = new Worker(new URL('@features/proxies/workers/proxy-worker', import.meta.url));

const endpoint = createEndpoint(worker, {
  callable: ['initConnection', 'getProxies', 'disconnect'],
});

const connected = createEvent<ChainId>();

type StartChainsProps = {
  chains: Chain[];
  connections: Record<ChainId, Connection>;
};
const startChainsFx = createEffect(({ chains, connections }: StartChainsProps) => {
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
};
type GetProxiesResult = {
  proxiesToAdd: ProxyAccount[];
  proxiesToRemove: ProxyAccount[];
};
const getProxiesFx = createEffect(({ chainId, accounts, proxies }: GetProxiesParams): Promise<GetProxiesResult> => {
  return endpoint.call.getProxies(
    chainId,
    keyBy(
      accounts.filter((a) => !accountUtils.isProxiedAccount(a)),
      'accountId',
    ),
    keyBy(accounts.filter(accountUtils.isProxiedAccount), 'accountId'),
    proxies,
  ) as Promise<GetProxiesResult>;
});

const disconnectFx = createEffect(async (chainId: ChainId) => {
  await endpoint.call.disconnect(chainId);
});

sample({
  clock: once(networkModel.$connections),
  source: {
    connections: networkModel.$connections,
    chains: networkModel.$chains,
  },
  fn: ({ connections, chains }) => ({
    chains: Object.values(chains).filter(proxyWorkerUtils.isRegularProxy),
    connections,
  }),
  target: startChainsFx,
});

sample({
  clock: connected,
  source: walletModel.$accounts,
  fn: (accounts, chainId) => {
    const chainAccounts = accounts.filter((account) => accountUtils.isChainIdMatch(account, chainId));

    return { chainId, accounts: chainAccounts, proxies: [] };
  },
  target: getProxiesFx,
});

spread({
  source: getProxiesFx.doneData,
  targets: {
    proxiesToAdd: proxyModel.events.proxiesAdded,
    proxiesToRemove: proxyModel.events.proxiesRemoved,
  },
});

sample({
  clock: getProxiesFx.doneData,
  fn: ({ proxiesToAdd, proxiesToRemove }) => {
    const proxyAddedNotifications = proxiesToAdd.map((proxy) =>
      proxyWorkerUtils.getNotification(proxy, NotificationType.PROXY_CREATED),
    );

    const proxyRemovedNotifications = proxiesToRemove.map((proxy) =>
      proxyWorkerUtils.getNotification(proxy, NotificationType.PROXY_REMOVED),
    );

    return { proxyAddedNotifications, proxyRemovedNotifications };
  },
  target: spread({
    targets: {
      proxyAddedNotifications: notificationModel.events.notificationsAdded,
      proxyRemovedNotifications: notificationModel.events.notificationsAdded,
    },
  }),
});

sample({
  clock: getProxiesFx.done,
  fn: ({ params: { chainId } }) => chainId,
  target: disconnectFx,
});

export const proxiesModel = {};
