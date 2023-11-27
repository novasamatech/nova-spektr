import { createEffect, createEvent, createStore, forward, sample } from 'effector';
import { ApiPromise } from '@polkadot/api';
import { ProviderInterface } from '@polkadot/rpc-provider/types';
import { UnsubscribePromise } from '@polkadot/api/types';

import { Metadata, ProviderType, chainsService, networkService } from '../lib';
import { Chain, ChainId, kernelModel } from '@renderer/shared/core';
import { useMetadata } from '../lib/metadataService';
import { UniversalProvider } from '../lib/provider/UniversalProvider';

export const enum NetworkStatus {
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  ERROR = 'ERROR',
}

const chains = chainsService.getChainsMap();

const defaultStatuses = Object.values(chains).reduce((acc, chain) => {
  acc[chain.chainId] = NetworkStatus.DISCONNECTED;

  return acc;
}, {} as Record<ChainId, NetworkStatus>);

const metadataStorage = useMetadata();

const $providers = createStore({} as Record<ChainId, ProviderInterface>);
const $apis = createStore({} as Record<ChainId, ApiPromise>);
const $networkStatuses = createStore(defaultStatuses);
const $chains = createStore<Record<ChainId, Chain>>(chains);

const $metadataList = createStore<Metadata[]>([]);
const $metadataSubscriptions = createStore<Record<ChainId, UnsubscribePromise>>({});

const chainStarted = createEvent<ChainId>();
const connectStarted = createEvent<ChainId>();
const disconnectStarted = createEvent<ChainId>();

const connected = createEvent<ChainId>();
const disconnected = createEvent<ChainId>();
const failed = createEvent<ChainId>();

const metadataUpdated = createEvent<Metadata>();
const metadataUnsubscribed = createEvent<[ChainId, UnsubscribePromise][]>();

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
const createProviderFx = createEffect(({ chainId, nodes }: CreateProviderParams): ProviderInterface => {
  // Doesn't work with effects (only in .watch)
  // const networkConnectedBinded = scopeBind(networkConnected);
  // const networkDisconnectedBinded = scopeBind(networkDisconnected);
  // const networkErrorBinded = scopeBind(networkError);

  const provider = networkService.createProvider(
    chainId,
    nodes,
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
  metadata?: Metadata;
  provider: ProviderInterface;
};
const createApiFx = createEffect(
  async ({ chainId, metadata, provider }: CreateApiParams): Promise<ApiPromise | undefined> => {
    if (provider.isConnected) {
      try {
        const api = await networkService.createApi(
          provider,
          metadata,
          () => {
            console.info('🟢 api connected ==> ', chainId);

            connected(chainId);
          },
          () => {
            console.info('🔶 api disconnected ==> ', chainId);

            disconnected(chainId);
          },
          () => {
            console.info('🔴 api error ==> ', chainId);

            failed(chainId);
          },
        );

        return api;
      } catch (e) {
        console.log('error during create api', e);
      }
    } else {
      setTimeout(() => {
        createApiFx({
          chainId,
          metadata,
          provider,
        });
      }, 1000);
    }
  },
);

type ConnectParams = {
  provider: ProviderInterface;
  api: ApiPromise;
};
const connectFx = createEffect(async ({ provider, api }: ConnectParams): Promise<void> => {
  await networkService.connect(provider, api);
});

type DisconnectParams = {
  provider: ProviderInterface;
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
  source: $metadataList,
  fn: (metadataList, { params, result: provider }) => ({
    chainId: params.chainId,
    provider,
    metadata: metadataList.reduce<Metadata | undefined>((acc, m) => {
      if (m.chainId === params.chainId && m.version >= (acc?.version || -1)) return m;

      return acc;
    }, undefined),
  }),
  target: createApiFx,
});

sample({
  clock: createApiFx.doneData,
  source: $apis,
  filter: (_, api) => api !== undefined,
  fn: (apis, api) => ({
    ...apis,
    [api!.genesisHash.toHex()]: api!,
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
    provider: providers[chainId] as UniversalProvider,
    type,
    chainId,
  }),
  target: switchProviderTypeFx,
});

// const switchProviderTypeFx = createEffect(
//   async ({ provider, type }: { provider: UniversalProvider; type: ProviderType }) => {
//     await provider.setProviderType(type);
//   },
// );

// sample({
//   clock: providerTypeSwitched,
//   source: $providers,
//   fn: (providers, { chainId, type }) => ({
//     provider: providers[chainId],
//     type,
//   }),
//   target: switchProviderTypeFx,
// });

const updateMetadataFx = createEffect(async (metadata: Metadata) => {
  await metadataStorage.updateMetadata(metadata);
});

const populateMetadataFx = createEffect((): Promise<Metadata[]> => {
  return metadataStorage.getAllMetadata();
});

const subscribeMetadataFx = createEffect(async (apiEntries: [ChainId, ApiPromise][]): Promise<UnsubscribePromise[]> => {
  return apiEntries.map(([_, api]) => metadataStorage.subscribeMetadata(api, () => syncMetadataFx(api)));
});

const unsubscribeMetadataFx = createEffect(
  async (unsubscribeEntries: [ChainId, UnsubscribePromise][]): Promise<void> => {
    unsubscribeEntries.forEach(([_, unsubscribe]) => unsubscribe);
  },
);

const syncMetadataFx = createEffect(async (api: ApiPromise) => {
  return await metadataStorage.syncMetadata(api);
});

forward({
  from: kernelModel.events.appStarted,
  to: populateMetadataFx,
});

forward({
  from: populateMetadataFx.doneData,
  to: $metadataList,
});

sample({
  clock: metadataUpdated,
  source: $metadataList,
  filter: (metadataList, metadata) =>
    metadataList.findIndex((m) => m.chainId === metadata.chainId && m.version === metadata.version) === -1,
  fn: (metadataList, metadata) => [...metadataList, metadata],
  target: $metadataList,
});

forward({
  from: metadataUpdated,
  to: updateMetadataFx,
});

sample({
  clock: $networkStatuses,
  source: {
    apis: $apis,
    subscriptions: $metadataSubscriptions,
  },
  fn: ({ apis, subscriptions }, statuses) =>
    Object.entries(apis).filter(([chainId]) => {
      return statuses[chainId as ChainId] === NetworkStatus.CONNECTED && !subscriptions[chainId as ChainId];
    }) as [ChainId, ApiPromise][],
  target: subscribeMetadataFx,
});

sample({
  clock: $networkStatuses,
  source: {
    subscriptions: $metadataSubscriptions,
  },
  fn: ({ subscriptions }, statuses) =>
    Object.entries(subscriptions).filter(([chainId]) => {
      return statuses[chainId as ChainId] === NetworkStatus.DISCONNECTED && subscriptions[chainId as ChainId];
    }) as [ChainId, UnsubscribePromise][],
  target: [unsubscribeMetadataFx],
});

sample({
  clock: metadataUnsubscribed,
  source: $metadataSubscriptions,
  fn: (subscriptions, unsubscribes) => {
    unsubscribes.forEach(([chainId]) => {
      delete subscriptions[chainId as ChainId];
    });

    return subscriptions;
  },
  target: $metadataSubscriptions,
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
  $chains,
  $apis,
  $networkStatuses,
  events: {
    chainStarted,
    providerTypeSwitched,
    connectStarted,
    disconnectStarted,
  },
};
