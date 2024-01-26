import { ApiPromise, ScProvider, WsProvider } from '@polkadot/api';
import { ProviderInterface } from '@polkadot/rpc-provider/types';
import * as Sc from '@substrate/connect';

import type { ChainId, HexString } from '@shared/core';
import { createCachedProvider } from '../provider/CachedProvider';
import { ProviderType, RpcValidation, ProviderWithMetadata } from '../lib/types';
import { getKnownChain, getLightClientChains } from '../lib/utils';

export const networkService = {
  createProvider,
  createApi,
  connect,
  disconnect,
  validateRpcNode,
  getLightClientChains,
};

function createApi(provider: ProviderInterface): Promise<ApiPromise> {
  return ApiPromise.create({ provider, throwOnConnect: true, throwOnUnknown: true });
}

type ProviderParams = {
  nodes: string[];
  metadata?: HexString;
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

function createSubstrateProvider(chainId: ChainId, metadata?: HexString): ProviderWithMetadata | undefined {
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

async function disconnect(api: ApiPromise) {
  try {
    await api.disconnect();
  } catch (e) {
    console.warn(e);
  }
}

async function connect(provider: ProviderInterface, api: ApiPromise) {
  try {
    await provider.connect();
  } catch (e) {
    console.warn(e);
  }

  try {
    await api.connect();
  } catch (e) {
    console.warn(e);
  }
}

function validateRpcNode(chainId: ChainId, rpcUrl: string): Promise<RpcValidation> {
  return new Promise((resolve) => {
    const provider = new WsProvider(rpcUrl);

    provider.on('connected', async () => {
      let isNetworkMatch = false;
      try {
        const api = await ApiPromise.create({ provider, throwOnConnect: true, throwOnUnknown: true });
        isNetworkMatch = chainId === api.genesisHash.toHex();

        api.disconnect().catch(console.warn);
      } catch (error) {
        console.warn(error);
      }

      provider.disconnect().catch(console.warn);

      resolve(isNetworkMatch ? RpcValidation.VALID : RpcValidation.WRONG_NETWORK);
    });

    provider.on('error', async () => {
      try {
        await provider.disconnect();
      } catch (error) {
        console.warn(error);
      }
      resolve(RpcValidation.INVALID);
    });
  });
}
