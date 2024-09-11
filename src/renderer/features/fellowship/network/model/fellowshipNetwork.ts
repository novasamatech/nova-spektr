import { combine, createEvent, createStore, sample } from 'effector';
import { spread } from 'patronum';

import { type ChainId, type ConnectionStatus } from '@/shared/core';
import { collectiveDomain } from '@/domains/collectives/init';
import { type CollectivePalletsType } from '@/domains/collectives/lib/types';
import { networkModel, networkUtils } from '@/entities/network';

const selectCollective = createEvent<{ chainId: ChainId; palletType: CollectivePalletsType }>();

const $selectedPallet = createStore<CollectivePalletsType | null>(null);
const $selectedChainId = createStore<ChainId | null>(null);

const $fellowshipStore = combine(collectiveDomain.$store, $selectedPallet, (store, selectedPallet) => {
  if (!selectedPallet) return null;

  return store[selectedPallet] || null;
});

sample({
  clock: selectCollective,
  fn: ({ chainId, palletType }) => ({
    chainId,
    palletType,
  }),
  target: spread({
    palletType: $selectedPallet,
    chainId: $selectedChainId,
  }),
});

const $selectedCollectiveData = combine($fellowshipStore, $selectedChainId, (fellowshipStore, selectedChainId) => {
  if (!fellowshipStore || !selectedChainId) return null;

  return fellowshipStore[selectedChainId];
});

const $fellowshipChain = combine(networkModel.$chains, $selectedChainId, (chains, collectiveChainId) => {
  return Object.values(chains).find((chain) => chain.chainId === collectiveChainId) || null;
});

const $isConnecting = combine(
  {
    chainId: $selectedChainId,
    statuses: networkModel.$connectionStatuses,
  },
  ({ chainId, statuses }) => {
    if (!chainId) return true;

    const status: ConnectionStatus = statuses[chainId];
    if (!status) return true;

    return networkUtils.isConnectingStatus(status);
  },
);

const $fellowshipChainApi = combine(
  {
    chainId: $selectedChainId,
    apis: networkModel.$apis,
  },
  ({ chainId, apis }) => {
    return chainId ? (apis[chainId] ?? null) : null;
  },
);

const $network = combine($fellowshipChain, $fellowshipChainApi, (chain, api) => {
  if (!chain || !api) return null;

  const asset = chain.assets.at(0);
  if (!asset) return null;

  return {
    chain,
    asset,
    api,
  };
});

const $palletInfo = combine($selectedChainId, $selectedPallet, $fellowshipChainApi, (chainId, palletType, api) => {
  if (!chainId || !palletType || !api) return null;

  return {
    palletType,
    chainId,
    api,
  };
});

export const fellowshipNetworkModel = {
  $network,
  $palletInfo,
  $selectedCollectiveData,

  $isConnecting,

  events: {
    selectCollective,
  },
};
