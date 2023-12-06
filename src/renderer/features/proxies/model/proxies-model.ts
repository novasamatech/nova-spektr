import { createEffect, createEvent, createStore, sample, scopeBind } from 'effector';
import { createEndpoint } from '@remote-ui/rpc';

import { AccountId, Chain, ChainId, kernelModel } from '@shared/core';
import { ProxiedAccount, ProxyStore } from '../common/types';
import { networkModel } from '@/src/renderer/entities/network';
import { getAccountsProxy, isRegularProxy } from '../common/utils';
import { walletModel } from '@/src/renderer/entities/wallet';

// @ts-ignore
const worker = new Worker(new URL('@features/proxies/workers/proxy-worker', import.meta.url));

const endpoint = createEndpoint(worker, {
  callable: ['initConnection', 'getProxies', 'disconnect'],
});

const $proxies = createStore<ProxyStore>({});
const $accountProxies = createStore<ProxyStore>({});

const connected = createEvent<ChainId>();

const startChainsFx = createEffect((chains: Chain[]) => {
  const bindedConnected = scopeBind(connected, { safe: true });

  chains.forEach((chain) => {
    endpoint.call.initConnection(chain).then(() => {
      bindedConnected(chain.chainId);
    });
  });
});

const getProxiesFx = createEffect(async (chainId: ChainId): Promise<ProxyStore> => {
  const proxies = (await endpoint.call.getProxies(chainId)) as Array<[AccountId, ProxiedAccount]>;

  const proxiesObject = Object.fromEntries(proxies);

  return {
    [chainId]: proxiesObject,
  };
});

const disconnectFx = createEffect((chainId: ChainId): Promise<unknown> => {
  return endpoint.call.disconnect(chainId);
});

sample({
  clock: kernelModel.events.appStarted,
  source: networkModel.$chains,
  fn: (chains) => Object.values(chains).filter(isRegularProxy),
  target: startChainsFx,
});

sample({
  clock: connected,
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
  fn: ({ params: chainId }) => chainId,
  target: disconnectFx,
});

sample({
  clock: $proxies,
  source: walletModel.$accounts,
  fn: (accounts, proxies) => getAccountsProxy(accounts, proxies),
  target: $accountProxies,
});

export const proxiesModel = {
  $proxies,
  $accountProxies,
};
