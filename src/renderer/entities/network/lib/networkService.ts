import { ApiPromise, ScProvider, WsProvider } from '@polkadot/api';
import { ProviderInterface } from '@polkadot/rpc-provider/types';
import * as Sc from '@substrate/connect';
import { noop } from '@polkadot/util';

import { ChainId } from '@shared/core';
import { Metadata } from './common/types';
import { chainSpecService } from './chainSpecService';
import { UniversalProvider } from './provider/UniversalProvider';

export const networkService = {
  createProvider,
  createApi,
  connect,
  disconnect,
};

async function createApi(
  provider: ProviderInterface,
  metadata?: Metadata,
  onConnected?: () => void,
  onDisconnected?: () => void,
  onError?: () => void,
) {
  const api = await ApiPromise.create({
    provider,
    throwOnConnect: true,
    throwOnUnknown: true,
    metadata: metadata?.metadata
      ? {
          [metadata.version.toString()]: metadata.metadata,
        }
      : undefined,
  });

  api.on('connected', onConnected || noop);
  api.on('disconnected', onDisconnected || noop);
  api.on('error', onError || noop);

  return api;
}

function createProvider(
  chainId: ChainId,
  nodes: string[],
  onConnected?: (value?: any) => void,
  onDisconnected?: (value?: any) => void,
  onError?: (value?: any) => void,
): UniversalProvider {
  let provider;

  const wsProvider = createWebsocketProvider(nodes);

  try {
    const scProvider = createSubstrateProvider(chainId);

    provider = new UniversalProvider(wsProvider, scProvider);
  } catch (e) {
    console.warn(e);

    const wsProvider2 = createWebsocketProvider(nodes);

    provider = new UniversalProvider(wsProvider, wsProvider2);
  }

  provider.on('connected', onConnected || noop);
  provider.on('disconnected', onDisconnected || noop);
  provider.on('error', onError || noop);

  return provider;
}

const createSubstrateProvider = (chainId: ChainId): ProviderInterface => {
  const knownChainId = chainSpecService.getKnownChain(chainId);

  if (knownChainId) {
    return new ScProvider(Sc, knownChainId);
  }

  throw new Error('Parachains do not support Substrate Connect yet');
};

const createWebsocketProvider = (rpcUrls: string[]): ProviderInterface => {
  return new WsProvider(rpcUrls, 2000);
};

async function disconnect(provider: ProviderInterface, api: ApiPromise) {
  try {
    await api.disconnect();
  } catch (e) {
    console.warn(e);
  }

  try {
    await provider.disconnect();
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
