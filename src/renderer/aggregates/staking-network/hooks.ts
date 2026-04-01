import { useStoreMap, useUnit } from 'effector-react';

import { stakingNetwork } from './model';

export const useStakingNetwork = () => {
  return useUnit(stakingNetwork.$network);
};

export const useStakingApi = () => {
  return useStoreMap(stakingNetwork.$network, n => n?.api ?? null);
};

export const useStakingChain = () => {
  return useStoreMap(stakingNetwork.$network, n => n?.chain ?? null);
};

export const useStakingAsset = () => {
  return useStoreMap(stakingNetwork.$network, n => n?.asset ?? null);
};

export const useStakingChainConnected = () => {
  return useUnit(stakingNetwork.$isConnected);
};

export const useStakingNetworkActive = () => {
  return useUnit(stakingNetwork.$networkIsActive);
};
