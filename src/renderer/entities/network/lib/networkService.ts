import { ApiPromise, ScProvider, WsProvider } from '@polkadot/api';
import { ProviderInterface } from '@polkadot/rpc-provider/types';
import * as Sc from '@substrate/connect';
import { noop } from '@polkadot/util';

import { UniversalProvider } from './provider/UniversalProvider';
import { ChainId } from '@shared/core';
import { createCachedProvider } from './provider/CachedProvider';
import { Metadata } from './common/types';
import { chainSpecService } from './chainSpecService';

export const networkService = {
  createProvider,
  createApi,
  connect,
  disconnect,
};

async function createApi(
  provider: ProviderInterface,
  onConnected?: () => void,
  onDisconnected?: () => void,
  onError?: () => void,
) {
  const api = await ApiPromise.create({ provider, throwOnConnect: true, throwOnUnknown: true });

  api.on('connected', onConnected || noop);
  api.on('disconnected', onDisconnected || noop);
  api.on('error', onError || noop);

  return api;
}

function createProvider(
  chainId: ChainId,
  nodes: string[],
  getMetadata: (chainId: ChainId) => Promise<Metadata | undefined>,
  onConnected?: (value?: any) => void,
  onDisconnected?: (value?: any) => void,
  onError?: (value?: any) => void,
): UniversalProvider {
  let provider;

  try {
    const scProvider = createSubstrateProvider(chainId, getMetadata);
    const wsProvider = createWebsocketProvider(nodes, chainId, getMetadata);

    provider = new UniversalProvider(wsProvider, scProvider);
  } catch (e) {
    console.warn(e);
    const wsProvider = createWebsocketProvider(nodes, chainId, getMetadata);

    provider = new UniversalProvider(wsProvider);
  }

  provider.on('connected', onConnected || noop);
  provider.on('disconnected', onDisconnected || noop);
  provider.on('error', onError || noop);

  return provider;
}

const createSubstrateProvider = (
  chainId: ChainId,
  getMetadata: (chainId: ChainId) => Promise<Metadata | undefined>,
): ProviderInterface => {
  const knownChainId = chainSpecService.getKnownChain(chainId);

  if (knownChainId) {
    const CachedScProvider = createCachedProvider(ScProvider, chainId, getMetadata);

    return new CachedScProvider(Sc, knownChainId);
  } else {
    throw new Error('Parachains do not support Substrate Connect yet');
  }
};

const createWebsocketProvider = (
  rpcUrls: string[],
  chainId: ChainId,
  getMetadata: (chainId: ChainId) => Promise<Metadata | undefined>,
): ProviderInterface => {
  // TODO: handle limited retries provider = new WsProvider(node.address, 5000, {1}, 11000);
  const CachedWsProvider = createCachedProvider(WsProvider, chainId, getMetadata);

  return new CachedWsProvider(rpcUrls, 2000);
};

async function disconnect(provider?: ProviderInterface, api?: ApiPromise) {
  try {
    await api?.disconnect();
  } catch (e) {
    console.warn(e);
  }

  try {
    await provider?.disconnect();
  } catch (e) {
    console.warn(e);
  }
}

async function connect(provider?: ProviderInterface, api?: ApiPromise) {
  try {
    await provider?.connect();
  } catch (e) {
    console.warn(e);
  }

  try {
    await api?.connect();
  } catch (e) {
    console.warn(e);
  }
}
