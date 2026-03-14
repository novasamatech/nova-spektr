import { combine, createEvent, createStore, sample } from 'effector';
import { or } from 'patronum';

import { localStorageService } from '@/shared/api/local-storage';
import { type ChainId, ConnectionStatus } from '@/shared/core';
import { getRelaychainAsset, nullable } from '@/shared/lib/utils';
import { DEFAULT_STAKING_CHAIN, STAKING_NETWORK } from '@/domains/staking';
import { networkModel, networkUtils } from '@/entities/network';

const selectChain = createEvent<ChainId>();
const init = createEvent();

const $selectedChainId = createStore<ChainId | null>(null);

sample({
  clock: init,
  fn: () => localStorageService.getFromStorage(STAKING_NETWORK, DEFAULT_STAKING_CHAIN) ?? null,
  target: $selectedChainId,
});

sample({
  clock: selectChain,
  fn: chainId => {
    localStorageService.saveToStorage(STAKING_NETWORK, chainId);

    return chainId;
  },
  target: $selectedChainId,
});

const $chain = combine(networkModel.$chains, $selectedChainId, (chains, chainId) => {
  if (nullable(chainId)) return null;

  return chains[chainId] ?? null;
});

const $connectionStatus = combine($selectedChainId, networkModel.$connectionStatuses, (chainId, statuses) => {
  if (!chainId) return ConnectionStatus.CONNECTING;

  return statuses[chainId] ?? ConnectionStatus.DISCONNECTED;
});

const $isConnecting = $connectionStatus.map(networkUtils.isConnectingStatus);
const $isConnected = $connectionStatus.map(networkUtils.isConnectedStatus);
const $isActive = or($isConnecting, $isConnected);
const $isDisconnected = $connectionStatus.map(networkUtils.isDisconnectedStatus);

const $api = combine($selectedChainId, networkModel.$apis, (chainId, apis) =>
  chainId ? (apis[chainId] ?? null) : null,
);

const $connection = combine($selectedChainId, networkModel.$connections, (chainId, connections) =>
  chainId ? (connections[chainId] ?? null) : null,
);

const $networkIsActive = combine($connection, $connectionStatus, (connection, status) => {
  if (nullable(connection) || nullable(status)) return true;

  const isDisabled = networkUtils.isDisabledConnection(connection);
  const isError = networkUtils.isErrorStatus(status);

  return !isDisabled && !isError;
});

const $network = combine({ chain: $chain, api: $api }, ({ chain, api }) => {
  if (nullable(chain) || nullable(api)) return null;

  const asset = getRelaychainAsset(chain.assets);
  if (nullable(asset)) return null;

  return {
    chainId: chain.chainId,
    chain,
    asset,
    api,
  };
});

export const stakingNetwork = {
  $network,
  $selectedChainId,
  $chain,
  $api,
  $connection,

  $isActive,
  $isConnected,
  $isConnecting,
  $isDisconnected,
  $networkIsActive,

  init,
  selectChain,
};
