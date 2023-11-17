import { createEffect, createEvent, createStore, forward, sample } from 'effector';
import { ApiPromise } from '@polkadot/api';

import { Metadata, ProviderType, chainsService, networkService } from '../lib';
import { ChainId, kernelModel } from '@renderer/shared/core';
import { UniversalProvider } from '../lib/provider/UniversalProvider';

const enum NetworkStatus {
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  ERROR = 'ERROR',
}

// Will be removed after metadata service will be refactored
const getMetadata = async (chainId: ChainId) =>
  ({
    chainId,
    version: 0,
    metadata: '0x',
  } as Metadata);

const chains = chainsService.getChainsMap();

const defaultStatuses = Object.values(chains).reduce((acc, chain) => {
  acc[chain.chainId] = NetworkStatus.DISCONNECTED;

  return acc;
}, {} as Record<ChainId, NetworkStatus>);

const $providers = createStore({} as Record<ChainId, UniversalProvider>);
const $apis = createStore({} as Record<ChainId, ApiPromise>);
const $networkStatuses = createStore(defaultStatuses);

const initConnection = createEvent<ChainId>();
const networkConnectStarted = createEvent<ChainId>();
const networkDisconnectStarted = createEvent<ChainId>();

const networkConnected = createEvent<ChainId>();
const networkDisconnected = createEvent<ChainId>();
const networkError = createEvent<ChainId>();

type ProviderTypeSwitchedParams = {
  chainId: ChainId;
  type: ProviderType;
};
const providerTypeSwitched = createEvent<ProviderTypeSwitchedParams>();

sample({
  source: $networkStatuses,
  clock: networkConnected,
  filter: (statuses, chainId) => statuses[chainId] !== NetworkStatus.CONNECTED,
  fn: (statuses, chainId) => ({
    ...statuses,
    [chainId]: NetworkStatus.CONNECTED,
  }),
  target: $networkStatuses,
});

sample({
  source: $networkStatuses,
  clock: networkDisconnected,
  filter: (statuses, chainId) => statuses[chainId] !== NetworkStatus.DISCONNECTED,
  fn: (statuses, chainId) => ({
    ...statuses,
    [chainId]: NetworkStatus.DISCONNECTED,
  }),
  target: $networkStatuses,
});

// Trigger update object twice (error -> disconnected)
// sample({
//   source: $networkStatuses,
//   clock: networkError,
//   filter: (statuses, chainId) => statuses[chainId] !== NetworkStatus.ERROR,
//   fn: (statuses, chainId) => ({
//     ...statuses,
//     [chainId]: NetworkStatus.ERROR,
//   }),
//   target: $networkStatuses,
// });

const initConnectionsFx = createEffect(async () => {
  Object.values(chains).forEach(({ chainId }) => {
    initConnection(chainId);
  });
});

type CreateProviderParams = {
  chainId: ChainId;
  nodes: string[];
};
const createProviderFx = createEffect(({ chainId, nodes }: CreateProviderParams): UniversalProvider => {
  // Doesn't work with effects (only in .watch)
  // const networkConnectedBinded = scopeBind(networkConnected);
  // const networkDisconnectedBinded = scopeBind(networkDisconnected);
  // const networkErrorBinded = scopeBind(networkError);

  const provider = networkService.createProvider(
    chainId,
    nodes,
    getMetadata,
    () => {
      console.info('🟢 provider connected ==> ', chainId);

      networkConnected(chainId);
    },
    () => {
      console.info('🔶 provider disconnected ==> ', chainId);

      networkDisconnected(chainId);
    },
    () => {
      console.info('🔴 provider error ==> ', chainId);

      networkError(chainId);
    },
  );

  return provider;
});

type CreateApiParams = {
  chainId: ChainId;
  provider: UniversalProvider;
};
const createApiFx = createEffect(async ({ chainId, provider }: CreateApiParams): Promise<ApiPromise | undefined> => {
  try {
    const api = await networkService.createApi(provider);

    return api;
  } catch (e) {
    console.log('error during create api', e);
  }
});

type ConnectParams = {
  provider: UniversalProvider;
  api: ApiPromise;
  chainId: ChainId;
};
const connectFx = createEffect(async ({ provider, api, chainId }: ConnectParams): Promise<ChainId> => {
  await networkService.connect(provider, api);

  return chainId;
});

type DisconnectParams = {
  provider: UniversalProvider;
  api: ApiPromise;
  chainId: ChainId;
};
const disconnectFx = createEffect(async ({ provider, api, chainId }: DisconnectParams): Promise<ChainId> => {
  await networkService.disconnect(provider, api);

  return chainId;
});

forward({
  from: kernelModel.events.appStarted,
  to: initConnectionsFx,
});

sample({
  clock: initConnection,
  fn: (chainId: ChainId) => ({
    chainId,
    nodes: chains[chainId].nodes.map((node) => node.url),
  }),
  target: createProviderFx,
});

sample({
  source: $providers,
  clock: createProviderFx.done,
  fn: (providers, { params, result: provider }) => ({
    ...providers,
    [params.chainId]: provider,
  }),
});

sample({
  clock: createProviderFx.done,
  fn: ({ params, result: provider }) => ({
    chainId: params.chainId,
    provider,
  }),
  target: createApiFx,
});

sample({
  source: $apis,
  clock: createApiFx.doneData,
  filter: (api) => Boolean(api),
  fn: (apis, api) => ({
    ...apis,
    [api!.genesisHash.toHex()]: api,
  }),
  target: $apis,
});

sample({
  source: { providers: $providers, apis: $apis },
  clock: networkConnectStarted,
  fn: ({ providers, apis }, chainId) => ({
    provider: providers[chainId],
    api: apis[chainId],
    chainId: chainId,
  }),
  target: connectFx,
});

sample({
  source: { providers: $providers, apis: $apis },
  clock: networkDisconnectStarted,
  filter: ({ providers, apis }, chainId) => Boolean(providers[chainId] && apis[chainId]),
  fn: ({ providers, apis }, chainId) => ({
    provider: providers[chainId],
    api: apis[chainId],
    chainId: chainId,
  }),
  target: disconnectFx,
});

const switchProviderTypeFx = createEffect(
  async ({ provider, type }: { provider: UniversalProvider; type: ProviderType }) => {
    await provider.setProviderType(type);
  },
);

sample({
  source: $providers,
  clock: providerTypeSwitched,
  fn: (providers, { chainId, type }) => ({
    provider: providers[chainId],
    type,
  }),
  target: switchProviderTypeFx,
});

export const networkModel = {
  chains,
  $apis,
  $networkStatuses,
  events: {
    initConnection,
    providerTypeSwitched,
    networkConnectStarted,
    networkDisconnectStarted,
  },
};
