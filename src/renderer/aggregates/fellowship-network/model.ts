import { combine, createEvent, createStore, sample } from 'effector';
import { or } from 'patronum';

import { type ChainId, ConnectionStatus } from '@/shared/core';
import { nullable } from '@/shared/lib/utils';
import { block, getChainRegistry, registry, registryService } from '@/domains/network';
import { networkModel } from '@/entities/network';

const selectCollective = createEvent<{ chainId: ChainId }>();

const $selectedChainId = createStore<ChainId | null>(null);

sample({
  clock: selectCollective,
  fn: ({ chainId }) => chainId,
  target: $selectedChainId,
});

const $fellowshipChain = combine($selectedChainId, collectiveChainId => {
  return getChainRegistry().chainsList.find(chain => chain.chainId === collectiveChainId) ?? null;
});

const $connectionStatus = combine(
  {
    chainId: $selectedChainId,
    papiStatus: registry.$connectionStatuses,
    pjsStatus: networkModel.$connectionStatuses,
  },
  ({ chainId, papiStatus, pjsStatus }) => {
    if (nullable(chainId)) return 'connecting';
    if (papiStatus[chainId] === 'connected' && pjsStatus[chainId] === ConnectionStatus.CONNECTED) return 'connected';

    return 'close';
  },
);

const $isConnecting = $connectionStatus.map(registryService.isConnecting);
const $isConnected = $connectionStatus.map(registryService.isConnected);
const $isActive = or($isConnecting, $isConnected);
const $isDisconnected = $connectionStatus.map(registryService.isClose);

const $fellowshipChainApi = combine($selectedChainId, networkModel.$apis, (chainId, apis) => {
  return chainId ? (apis[chainId] ?? null) : null;
});

const $network = combine({ chain: $fellowshipChain, api: $fellowshipChainApi }, ({ chain, api }) => {
  if (nullable(chain) || nullable(api)) return null;

  const asset = chain.assets.at(0);
  if (nullable(asset)) return null;

  return {
    palletType: 'fellowship' as const,
    chainId: chain.chainId,
    chain,
    asset,
    api,
  };
});

const $currentBlock = combine(block.$currentBlock, $network, (currentBlock, network) => {
  if (nullable(network?.chainId)) return null;

  return currentBlock[network.chainId] ?? null;
});

export const fellowshipNetwork = {
  $network,
  $selectedChainId,

  $isActive,
  $isConnected,
  $isConnecting,
  $isDisconnected,

  selectCollective,

  $currentBlock,
};
