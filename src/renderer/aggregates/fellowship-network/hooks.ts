import { useStoreMap, useUnit } from 'effector-react';

import { useBlock } from '@/domains/network';

import { fellowshipNetwork } from './model';

export const useFellowshipNetwork = () => {
  return useUnit(fellowshipNetwork.$network);
};

export const useFellowshipApi = () => {
  return useStoreMap(fellowshipNetwork.$network, n => n?.api ?? null);
};

export const useFellowshipChain = () => {
  return useStoreMap(fellowshipNetwork.$network, n => n?.chain ?? null);
};

export const useFellowshipAsset = () => {
  return useStoreMap(fellowshipNetwork.$network, n => n?.asset ?? null);
};

export const useFellowshipBlock = () => {
  const api = useFellowshipApi();
  return useBlock(api);
};

export const useFellowshipChainConnected = () => {
  return useUnit(fellowshipNetwork.$isConnected);
};
