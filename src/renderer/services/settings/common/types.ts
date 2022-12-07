import { ChainId } from '@renderer/domain/shared-kernel';

export type ISettingsStorage = {
  setHideZeroBalance: (hideZeroBalance: boolean) => void;
  getHideZeroBalance: () => boolean;
  setStakingNetwork: (chainId: ChainId) => void;
  getStakingNetwork: () => ChainId;
};
