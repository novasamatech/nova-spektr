import { ApiPromise, ScProvider, WsProvider } from '@polkadot/api';
import { ProviderInterface } from '@polkadot/rpc-provider/types';
import * as Sc from '@substrate/connect';
import { noop } from '@polkadot/util';

import { ChainId } from '@shared/core';
import { ProviderType, RpcValidation } from './common/types';
import { chainSpecService } from './chainSpecService';
import { useMetadata } from './metadataService';
import { createCachedProvider } from './provider/CachedProvider';

const metadataService = useMetadata();

export const networkService = {
  createProvider,
  createApi,
  connect,
  disconnect,
  validateRpcNode,
};

async function createApi(
  provider: ProviderInterface,
  onConnected?: () => void,
  onDisconnected?: () => void,
  onError?: () => void,
) {
  const api = await ApiPromise.create({
    provider,
    throwOnConnect: true,
    throwOnUnknown: true,
  });

  api.on('connected', onConnected || noop);
  api.on('disconnected', onDisconnected || noop);
  api.on('error', onError || noop);

  return api;
}

function createProvider(
  chainId: ChainId,
  nodes: string[],
  providerType: ProviderType,
  onConnected?: (value?: any) => void,
  onDisconnected?: (value?: any) => void,
  onError?: (value?: any) => void,
): ProviderInterface {
  let provider;

  if (providerType === ProviderType.WEB_SOCKET) {
    provider = createWebsocketProvider(nodes, chainId);
  } else {
    provider = createSubstrateProvider(chainId);
  }

  if (!provider) {
    throw new Error('Provider not found');
  }

  provider.on('connected', onConnected || noop);
  provider.on('disconnected', onDisconnected || noop);
  provider.on('error', onError || noop);

  return provider;
}

function createSubstrateProvider(chainId: ChainId): ProviderInterface | undefined {
  const knownChainId = chainSpecService.getKnownChain(chainId);

  if (knownChainId) {
    const CachedScProvider = createCachedProvider(ScProvider, chainId, metadataService.getMetadata);

    return new CachedScProvider(Sc, knownChainId);
  }

  throw new Error('Parachains do not support Substrate Connect yet');
}

function createWebsocketProvider(nodes: string[], chainId: ChainId): ProviderInterface {
  const CachedWsProvider = createCachedProvider(WsProvider, chainId, metadataService.getMetadata);

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
