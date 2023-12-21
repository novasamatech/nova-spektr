import type { ChainId } from '@shared/core';

export type ISettingsStorage = {
  setHideZeroBalance: (hideZeroBalance: boolean) => void;
  getHideZeroBalance: () => boolean;
  setStakingNetwork: (chainId: ChainId) => void;
  getStakingNetwork: () => ChainId;
};
