import { ApiPromise, ScProvider, WsProvider } from '@polkadot/api';
import { type ProviderInterface } from '@polkadot/rpc-provider/types';
import * as Sc from '@substrate/connect';

import { EXTENSIONS } from '@/shared/config/extensions';
import { type ChainId, type ChainMetadata } from '@/shared/core';
import { getKnownChain } from '@/shared/lib/utils';
import { ProviderType, type ProviderWithMetadata } from '../lib/types';
import { createCachedProvider } from '../provider/CachedProvider';

export const networkService = {
  createProvider,
  createApi,
};

function createApi(chainId: ChainId, provider: ProviderInterface): Promise<ApiPromise> {
  const api = new ApiPromise({
    provider,
    noInitWarn: true,
    throwOnConnect: true,
    throwOnUnknown: true,
    ...EXTENSIONS[chainId]?.provider,
  });

  return api.isReady;
}

type ProviderParams = {
  nodes?: string[];
  metadata?: ChainMetadata;
};
type ProviderListeners = {
  onConnected: (value?: any) => void;
  onDisconnected: (value?: any) => void;
  onError: (value?: any) => void;
};
function createProvider(
  chainId: ChainId,
  providerType: ProviderType,
  params: ProviderParams,
  listeners: ProviderListeners,
): ProviderWithMetadata {
  const creatorFn: Record<ProviderType, () => ProviderWithMetadata | undefined> = {
    [ProviderType.WEB_SOCKET]: () => createWebsocketProvider(params),
    [ProviderType.LIGHT_CLIENT]: () => createSubstrateProvider(chainId, params.metadata),
  };

  const provider = creatorFn[providerType]();

  if (!provider) {
    throw new Error('Provider not found');
  }

  provider.on('connected', listeners.onConnected);
  provider.on('disconnected', listeners.onDisconnected);
  provider.on('error', listeners.onError);

  return provider;
}

function createSubstrateProvider(chainId: ChainId, metadata?: ChainMetadata): ProviderWithMetadata | undefined {
  const knownChainId = getKnownChain(chainId);

  if (knownChainId) {
    const CachedScProvider = createCachedProvider(ScProvider, metadata);

    return new CachedScProvider(Sc, knownChainId);
  }

  throw new Error(`Chain ${chainId} do not support Substrate Connect yet`);
}

function createWebsocketProvider({ nodes, metadata }: ProviderParams): ProviderWithMetadata {
  const CachedWsProvider = createCachedProvider(WsProvider, metadata);

  return new CachedWsProvider(nodes, 2000);
}
