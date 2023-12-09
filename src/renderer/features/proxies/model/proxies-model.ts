import { createEffect, createEvent, sample, scopeBind } from 'effector';
import { createEndpoint } from '@remote-ui/rpc';
import { keyBy } from 'lodash';
import { once, spread } from 'patronum';

import { Account, Chain, ChainId, Connection, ProxyAccount } from '@shared/core';
import { networkModel } from '@entities/network';
import { proxyWorkerUtils } from '../common/utils';
import { accountUtils, walletModel } from '@entities/wallet';
import { proxyModel } from '@entities/proxy';

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
  const bindedConnected = scopeBind(connected, { safe: true });

  chains.forEach((chain) => {
    endpoint.call.initConnection(chain, connections[chain.chainId]).then(() => {
      bindedConnected(chain.chainId);
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
  return endpoint.call.getProxies(chainId, keyBy(accounts, 'accountId'), proxies) as Promise<GetProxiesResult>;
});

const disconnectFx = createEffect((chainId: ChainId): Promise<unknown> => {
  return endpoint.call.disconnect(chainId);
});

sample({
  clock: once(networkModel.$connections),
  source: { connections: networkModel.$connections, chains: networkModel.$chains },
  fn: ({ connections, chains }) => ({
    chains: Object.values(chains).filter(proxyWorkerUtils.isRegularProxy),
    connections,
  }),
  target: startChainsFx,
});

sample({
  clock: connected,
  source: walletModel.$accounts,
  fn: (accounts, chainId) => ({
    chainId,
    accounts: accounts.filter((a) => accountUtils.isChainIdMatch(a, chainId)),
    proxies: [],
  }),
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
  clock: getProxiesFx.done,
  fn: ({ params: { chainId } }) => chainId,
  target: disconnectFx,
});

export const proxiesModel = {};
