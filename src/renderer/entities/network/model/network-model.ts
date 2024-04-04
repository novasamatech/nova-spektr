import { createEffect, createEvent, createStore, sample, scopeBind } from 'effector';
import { ApiPromise } from '@polkadot/api';
import { VoidFn } from '@polkadot/api/types';
import { spread } from 'patronum';

import { storageService } from '@shared/api/storage';
import { dictionary } from '@shared/lib/utils';
import { networkUtils } from '../lib/network-utils';
import {
  Chain,
  ChainId,
  Connection,
  ConnectionStatus,
  ConnectionType,
  ChainMetadata,
  NoID,
  Metadata,
} from '@shared/core';
import {
  ProviderType,
  chainsService,
  networkService,
  metadataService,
  ProviderWithMetadata,
} from '@shared/api/network';

const networkStarted = createEvent();
const chainConnected = createEvent<ChainId>();
const connectionStatusChanged = createEvent<{ chainId: ChainId; status: ConnectionStatus }>();

const connected = createEvent<ChainId>();
const disconnected = createEvent<ChainId>();
const failed = createEvent<ChainId>();

const $chains = createStore<Record<ChainId, Chain>>({});

const $providers = createStore<Record<ChainId, ProviderWithMetadata>>({});
const $apis = createStore<Record<ChainId, ApiPromise>>({});

const $connections = createStore<Record<ChainId, Connection>>({});
const $connectionStatuses = createStore<Record<ChainId, ConnectionStatus>>({});

const $metadata = createStore<ChainMetadata[]>([]);
const $metadataSubscriptions = createStore<Record<ChainId, VoidFn>>({});

const populateChainsFx = createEffect((): Record<ChainId, Chain> => {
  return chainsService.getChainsMap({ sort: true });
});

const populateMetadataFx = createEffect((): Promise<ChainMetadata[]> => {
  return storageService.metadata.readAll();
});

const populateConnectionsFx = createEffect((): Promise<Connection[]> => {
  return storageService.connections.readAll();
});

const getDefaultStatusesFx = createEffect((chains: Record<ChainId, Chain>): Record<ChainId, ConnectionStatus> => {
  return Object.values(chains).reduce<Record<ChainId, ConnectionStatus>>((acc, chain) => {
    acc[chain.chainId] = ConnectionStatus.DISCONNECTED;

    return acc;
  }, {});
});

type MetadataSubResult = {
  chainId: ChainId;
  unsubscribe: VoidFn;
};
const subscribeMetadataFx = createEffect(async (api: ApiPromise): Promise<MetadataSubResult> => {
  const unsubscribe = await metadataService.subscribeMetadata(api, requestMetadataFx);

  return { chainId: api.genesisHash.toHex(), unsubscribe };
});

const requestMetadataFx = createEffect((api: ApiPromise): Promise<NoID<ChainMetadata>> => {
  return metadataService.requestMetadata(api);
});

const unsubscribeMetadataFx = createEffect((unsubscribe: VoidFn) => {
  unsubscribe();
});

const saveMetadataFx = createEffect((metadata: NoID<ChainMetadata>): Promise<ChainMetadata | undefined> => {
  return storageService.metadata.put(metadata);
});

type ProviderMetadataParams = {
  provider: ProviderWithMetadata;
  metadata: Metadata;
};
const updateProviderMetadataFx = createEffect(({ provider, metadata }: ProviderMetadataParams) => {
  provider.updateMetadata(metadata);
});

const initConnectionsFx = createEffect((chains: Record<ChainId, Chain>) => {
  Object.keys(chains).forEach((chainId) => chainConnected(chainId as ChainId));
});

const updateConnectionFx = createEffect((connection: Connection): Promise<Connection | undefined> => {
  return storageService.connections.put(connection);
});

type CreateProviderParams = {
  chainId: ChainId;
  nodes: string[];
  metadata?: ChainMetadata;
  providerType: ProviderType;
};
const createProviderFx = createEffect(
  async ({ chainId, nodes, metadata, providerType }: CreateProviderParams): Promise<ProviderWithMetadata> => {
    const boundConnected = scopeBind(connected, { safe: true });
    const boundDisconnected = scopeBind(disconnected, { safe: true });
    const boundFailed = scopeBind(failed, { safe: true });

    const provider = networkService.createProvider(
      chainId,
      providerType,
      { nodes, metadata: metadata?.metadata },
      {
        onConnected: () => {
          console.info('🟢 Provider connected ==> ', chainId);
          boundConnected(chainId);
        },
        onDisconnected: () => {
          console.info('🟠 Provider disconnected ==> ', chainId);
          boundDisconnected(chainId);
        },
        onError: () => {
          console.info('🔴 Provider error ==> ', chainId);
          boundFailed(chainId);
        },
      },
    );

    if (providerType === ProviderType.LIGHT_CLIENT) {
      /**
       * HINT: Light Client provider must be connected manually
       * GitHub Light Client section - https://github.com/polkadot-js/api/tree/master/packages/rpc-provider#readme
       */
      await provider.connect();
    }

    return provider;
  },
);

type CreateApiParams = {
  chainId: ChainId;
  providers: Record<ChainId, ProviderWithMetadata>;
};
const createApiFx = createEffect(({ chainId, providers }: CreateApiParams): Promise<ApiPromise> => {
  return networkService.createApi(providers[chainId]);
});

const disconnectApiFx = createEffect(async (api: ApiPromise): Promise<ChainId> => {
  const chainId = api.genesisHash.toHex();
  await api.disconnect();

  return chainId;
});

sample({
  clock: networkStarted,
  target: [populateChainsFx, populateMetadataFx, populateConnectionsFx],
});

sample({
  clock: populateChainsFx.doneData,
  target: [$chains, getDefaultStatusesFx],
});

sample({
  clock: populateMetadataFx.doneData,
  target: $metadata,
});

sample({
  clock: getDefaultStatusesFx.doneData,
  target: $connectionStatuses,
});

sample({
  clock: populateConnectionsFx.doneData,
  source: $chains,
  fn: (chains, connections) => {
    const connectionsMap = dictionary(connections, 'chainId');
    const lightClientChains = networkUtils.getLightClientChains();

    return Object.keys(chains).reduce<Record<ChainId, Connection>>((acc, key) => {
      const chainId = key as ChainId;

      acc[chainId] = connectionsMap[chainId] || {
        chainId,
        customNodes: [],
        connectionType: ConnectionType.AUTO_BALANCE,
      };
      acc[chainId].canUseLightClient = lightClientChains.includes(chainId);

      return acc;
    }, {});
  },
  target: $connections,
});

sample({
  clock: populateConnectionsFx.doneData,
  source: $chains,
  target: initConnectionsFx,
});

sample({
  clock: chainConnected,
  source: {
    chains: $chains,
    connections: $connections,
    metadata: $metadata,
  },
  filter: ({ connections }, chainId) => {
    return !connections[chainId] || networkUtils.isEnabledConnection(connections[chainId]);
  },
  fn: (store, chainId) => {
    const connection = store.connections[chainId];

    const providerType = networkUtils.isLightClientConnection(connection)
      ? ProviderType.LIGHT_CLIENT
      : ProviderType.WEB_SOCKET;

    const nodes =
      !connection || networkUtils.isAutoBalanceConnection(connection)
        ? [...(store.chains[chainId]?.nodes || []), ...(connection?.customNodes || [])].map((node) => node.url)
        : [connection?.activeNode?.url || ''];

    const metadata = networkUtils.getNewestMetadata(store.metadata)[chainId];

    return { chainId, nodes, metadata, providerType };
  },
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
  source: $connectionStatuses,
  fn: (statuses, { params }) => ({
    ...statuses,
    [params.chainId]: ConnectionStatus.CONNECTING,
  }),
  target: $connectionStatuses,
});

sample({
  clock: connected,
  source: $providers,
  fn: (providers, chainId) => ({ chainId, providers }),
  target: createApiFx,
});

sample({
  clock: createApiFx.done,
  source: $apis,
  fn: (apis, { result, params }) => {
    return { ...apis, [params.chainId]: result };
  },
  target: $apis,
});

sample({
  clock: createApiFx.done,
  source: $connectionStatuses,
  fn: (statuses, { params }) => ({
    newStatuses: { ...statuses, [params.chainId]: ConnectionStatus.CONNECTED },
    event: { chainId: params.chainId, status: ConnectionStatus.CONNECTED },
  }),
  target: spread({
    newStatuses: $connectionStatuses,
    event: connectionStatusChanged,
  }),
});

sample({
  clock: disconnected,
  source: $connectionStatuses,
  fn: (statuses, chainId) => ({
    newStatuses: { ...statuses, [chainId]: ConnectionStatus.DISCONNECTED },
    event: { chainId, status: ConnectionStatus.DISCONNECTED },
  }),
  target: spread({
    newStatuses: $connectionStatuses,
    event: connectionStatusChanged,
  }),
});

sample({
  clock: failed,
  source: $connectionStatuses,
  fn: (statuses, chainId) => ({
    newStatuses: { ...statuses, [chainId]: ConnectionStatus.ERROR },
    event: { chainId, status: ConnectionStatus.ERROR },
  }),
  target: spread({
    newStatuses: $connectionStatuses,
    event: connectionStatusChanged,
  }),
});

sample({
  clock: [disconnected, failed],
  source: $apis,
  fn: (apis, chainId) => apis[chainId],
  target: disconnectApiFx,
});

sample({
  clock: disconnectApiFx.doneData,
  source: $apis,
  fn: (apis, chainId) => {
    const { [chainId]: _, ...rest } = apis;

    return rest;
  },
  target: $apis,
});

// =====================================================
// ================ Metadata section ===================
// =====================================================

sample({
  clock: createApiFx.doneData,
  target: subscribeMetadataFx,
});

sample({
  clock: subscribeMetadataFx.doneData,
  source: $metadataSubscriptions,
  fn: (subscriptions, { chainId, unsubscribe }) => ({
    ...subscriptions,
    [chainId]: unsubscribe,
  }),
  target: $metadataSubscriptions,
});

sample({
  clock: disconnectApiFx.doneData,
  source: $metadataSubscriptions,
  fn: (metadataSubscriptions, chainId) => metadataSubscriptions[chainId],
  target: unsubscribeMetadataFx,
});

sample({
  clock: disconnectApiFx.doneData,
  source: $metadataSubscriptions,
  fn: (subscriptions, chainId) => {
    const { [chainId]: _, ...rest } = subscriptions;

    return rest;
  },
  target: $metadataSubscriptions,
});

sample({
  clock: requestMetadataFx.doneData,
  target: saveMetadataFx,
});

sample({
  clock: saveMetadataFx.doneData,
  source: $metadata,
  filter: (_, newMetadata) => Boolean(newMetadata),
  fn: (metadata, newMetadata) => metadata.concat(newMetadata!),
  target: $metadata,
});

sample({
  clock: saveMetadataFx.doneData,
  source: $providers,
  filter: (metadata) => Boolean(metadata),
  fn: (providers, metadata) => ({
    provider: providers[metadata!.chainId],
    metadata: metadata!.metadata,
  }),
  target: updateProviderMetadataFx,
});

export const networkModel = {
  $chains,
  $apis,
  $providers,
  $connectionStatuses,
  $connections,
  events: {
    networkStarted,
    chainConnected,
  },
  output: {
    connectionStatusChanged,
  },
  effects: {
    updateConnectionFx,
  },
};
