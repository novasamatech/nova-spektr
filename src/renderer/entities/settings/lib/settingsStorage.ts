import { UserSettings } from './common/constants';
import type { ChainId } from '@shared/core';

export const settingsStorage = {
  setStakingNetwork,
  getStakingNetwork,
};

function setStakingNetwork(chainId: ChainId): void {
  localStorage.setItem(UserSettings.STAKING_NETWORK, chainId);
}

function getStakingNetwork(): ChainId {
  return (localStorage.getItem(UserSettings.STAKING_NETWORK) as ChainId) || '';
}
