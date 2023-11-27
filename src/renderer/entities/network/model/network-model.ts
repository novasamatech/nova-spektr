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

const chainStarted = createEvent<ChainId>();
const connectStarted = createEvent<ChainId>();
const disconnectStarted = createEvent<ChainId>();

const connected = createEvent<ChainId>();
const disconnected = createEvent<ChainId>();
const failed = createEvent<ChainId>();

type ProviderTypeSwitchedParams = {
  chainId: ChainId;
  type: ProviderType;
};
const providerTypeSwitched = createEvent<ProviderTypeSwitchedParams>();

sample({
  clock: connected,
  source: $networkStatuses,
  filter: (statuses, chainId) => statuses[chainId] !== NetworkStatus.CONNECTED,
  fn: (statuses, chainId) => ({
    ...statuses,
    [chainId]: NetworkStatus.CONNECTED,
  }),
  target: $networkStatuses,
});

sample({
  clock: disconnected,
  source: $networkStatuses,
  filter: (statuses, chainId) => statuses[chainId] !== NetworkStatus.DISCONNECTED,
  fn: (statuses, chainId) => ({
    ...statuses,
    [chainId]: NetworkStatus.DISCONNECTED,
  }),
  target: $networkStatuses,
});

const initConnectionsFx = createEffect(() => {
  Object.values(chains).forEach(({ chainId }) => {
    chainStarted(chainId);
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

      connected(chainId);
    },
    () => {
      console.info('🔶 provider disconnected ==> ', chainId);

      disconnected(chainId);
    },
    () => {
      console.info('🔴 provider error ==> ', chainId);

      failed(chainId);
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
    return networkService.createApi(provider);
  } catch (e) {
    console.log('error during create api', e);
  }
});

type ConnectParams = {
  provider: UniversalProvider;
  api: ApiPromise;
};
const connectFx = createEffect(async ({ provider, api }: ConnectParams): Promise<void> => {
  await networkService.connect(provider, api);
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
  clock: chainStarted,
  fn: (chainId: ChainId) => ({
    chainId,
    nodes: chains[chainId].nodes.map((node) => node.url),
  }),
  target: createProviderFx,
});

sample({
  clock: createProviderFx.done,
  source: $providers,
  fn: (providers, { params, result: provider }) => ({
    ...providers,
    [params.chainId]: provider,
  }),
  target: $providers,
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
  clock: createApiFx.doneData,
  source: $apis,
  filter: (api) => Boolean(api),
  fn: (apis, api) => ({
    ...apis,
    [api!.genesisHash.toHex()]: api,
  }),
  target: $apis,
});

sample({
  clock: connectStarted,
  source: { providers: $providers, apis: $apis },
  fn: ({ providers, apis }, chainId) => ({
    provider: providers[chainId],
    api: apis[chainId],
  }),
  target: connectFx,
});

sample({
  clock: disconnectStarted,
  source: { providers: $providers, apis: $apis },
  filter: ({ providers, apis }, chainId) => Boolean(providers[chainId] && apis[chainId]),
  fn: ({ providers, apis }, chainId) => ({
    provider: providers[chainId],
    api: apis[chainId],
    chainId: chainId,
  }),
  target: disconnectFx,
});

const switchProviderTypeFx = createEffect(
  async ({ chainId, provider, type }: { chainId: ChainId; provider: UniversalProvider; type: ProviderType }) => {
    await provider.setProviderType(type);
  },
);

const apiReconnectFx = createEffect(
  async ({ provider, api }: { provider: UniversalProvider; api: ApiPromise }): Promise<void> => {
    await networkService.connect(provider, api);
  },
);

sample({
  clock: providerTypeSwitched,
  source: $providers,
  fn: (providers, { chainId, type }) => ({
    provider: providers[chainId],
    type,
    chainId,
  }),
  target: switchProviderTypeFx,
});

sample({
  clock: switchProviderTypeFx.done,
  source: { apis: $apis },
  fn: ({ apis }, { params: { provider, chainId } }) => ({
    provider,
    api: apis[chainId],
  }),
  target: apiReconnectFx,
});

export const networkModel = {
  chains,
  $apis,
  $networkStatuses,
  events: {
    chainStarted,
    providerTypeSwitched,
    connectStarted,
    disconnectStarted,
  },
};
