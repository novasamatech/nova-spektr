import { UserSettings } from './lib/types';
import type { ChainId } from '@shared/core';

// TODO: should be removed
// Access STAKING_NETWORK on page directly
export const settingsStorage = {
  setStakingNetwork,
  getStakingNetwork,
};

function setStakingNetwork(chainId: ChainId) {
  localStorage.setItem(UserSettings.STAKING_NETWORK, chainId);
}

function getStakingNetwork(): ChainId {
  return (localStorage.getItem(UserSettings.STAKING_NETWORK) as ChainId) || '';
}
