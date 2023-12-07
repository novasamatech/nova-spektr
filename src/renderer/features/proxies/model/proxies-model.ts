import { createEffect, createEvent, createStore, sample, scopeBind } from 'effector';
import { createEndpoint } from '@remote-ui/rpc';
import { keyBy } from 'lodash';
import { once } from 'patronum';

import { Account, Chain, ChainAccount, ChainId, Connection } from '@shared/core';
import { ProxyAccount, ProxyStore } from '../common/types';
import { networkModel } from '@/src/renderer/entities/network';
import { proxieWorkerUtils } from '../common/utils';
import { walletModel } from '@/src/renderer/entities/wallet';

// @ts-ignore
const worker = new Worker(new URL('@features/proxies/workers/proxy-worker', import.meta.url));

const endpoint = createEndpoint(worker, {
  callable: ['initConnection', 'getProxies', 'disconnect'],
});

const $proxies = createStore<ProxyStore>({});
const $accountProxies = createStore<ProxyStore>({});

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
const getProxiesFx = createEffect(async ({ chainId, accounts, proxies }: GetProxiesParams): Promise<ProxyStore> => {
  const { proxiesToAdd, proxiesToRemove } = (await endpoint.call.getProxies(
    chainId,
    keyBy(accounts, 'accountId'),
    proxies,
  )) as {
    proxiesToAdd: ProxyAccount[];
    proxiesToRemove: ProxyAccount[];
  };

  return {
    [chainId]: proxies
      .filter((p) => proxiesToRemove.some((pr) => proxieWorkerUtils.isEqualProxies(pr, p)))
      .concat(proxiesToAdd),
  };
});

const disconnectFx = createEffect((chainId: ChainId): Promise<unknown> => {
  return endpoint.call.disconnect(chainId);
});

sample({
  clock: once(networkModel.$connections),
  source: { connections: networkModel.$connections, chains: networkModel.$chains },
  fn: ({ connections, chains }) => ({
    chains: Object.values(chains).filter(proxieWorkerUtils.isRegularProxy),
    connections,
  }),
  target: startChainsFx,
});

sample({
  clock: connected,
  source: walletModel.$accounts,
  fn: (accounts, chainId) => ({
    chainId,
    accounts: accounts.filter((a) => !(a as ChainAccount).chainId || (a as ChainAccount).chainId === chainId),
    proxies: [],
  }),
  target: getProxiesFx,
});

sample({
  clock: getProxiesFx.doneData,
  source: $proxies,
  fn: (oldProxies, newProxies) => ({ ...oldProxies, ...newProxies }),
  target: $proxies,
});

sample({
  clock: getProxiesFx.done,
  fn: ({ params: { chainId } }) => chainId,
  target: disconnectFx,
});

export const proxiesModel = {
  $proxies,
  $accountProxies,
};
