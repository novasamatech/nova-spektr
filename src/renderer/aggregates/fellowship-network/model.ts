import { combine, createEvent, createStore, sample } from 'effector';
import { or } from 'patronum';

import { type ChainId, ConnectionStatus } from '@/shared/core';
import { nullable } from '@/shared/lib/utils';
import { networkModel, networkUtils } from '@/entities/network';

const selectCollective = createEvent<{ chainId: ChainId }>();

const $selectedChainId = createStore<ChainId | null>(null);

sample({
  clock: selectCollective,
  fn: ({ chainId }) => chainId,
  target: $selectedChainId,
});

const $fellowshipChain = combine(networkModel.$chains, $selectedChainId, (chains, collectiveChainId) => {
  return Object.values(chains).find(chain => chain.chainId === collectiveChainId) || null;
});

const $connectionStatus = combine($selectedChainId, networkModel.$connectionStatuses, (chainId, statuses) => {
  if (!chainId) return ConnectionStatus.CONNECTING;

  return statuses[chainId] ?? ConnectionStatus.DISCONNECTED;
});

const $isConnecting = $connectionStatus.map(networkUtils.isConnectingStatus);
const $isConnected = $connectionStatus.map(networkUtils.isConnectedStatus);
const $isActive = or($isConnecting, $isConnected);
const $isDisconnected = $connectionStatus.map(networkUtils.isDisconnectedStatus);

const $fellowshipChainApi = combine($selectedChainId, networkModel.$apis, (chainId, apis) =>
  chainId ? (apis[chainId] ?? null) : null,
);

const $network = combine(
  { chain: $fellowshipChain, api: $fellowshipChainApi, connected: $isConnected },
  ({ chain, api, connected }) => {
    if (nullable(chain) || nullable(api) || !connected) return null;

    const asset = chain.assets.at(0);
    if (nullable(asset)) return null;

    return {
      palletType: 'fellowship' as const,
      chainId: chain.chainId,
      connected,
      chain,
      asset,
      api,
    };
  },
);

export const fellowshipNetwork = {
  $network,
  $selectedChainId,

  $isActive,
  $isConnected,
  $isConnecting,
  $isDisconnected,

  selectCollective,
};
