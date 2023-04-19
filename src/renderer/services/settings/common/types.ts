import { ChainID } from '@renderer/domain/shared-kernel';

export type ISettingsStorage = {
  setHideZeroBalance: (hideZeroBalance: boolean) => void;
  getHideZeroBalance: () => boolean;
  setStakingNetwork: (chainId: ChainID) => void;
  getStakingNetwork: () => ChainID;
};
