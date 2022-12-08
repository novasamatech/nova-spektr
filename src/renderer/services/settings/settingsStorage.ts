import { ChainId } from '@renderer/domain/shared-kernel';
import { UserSettings, TRUE } from './common/constants';
import { ISettingsStorage } from './common/types';

export const useSettingsStorage = (): ISettingsStorage => ({
  setHideZeroBalance: (hideZeroBalance: boolean) => {
    localStorage.setItem(UserSettings.HIDE_ZERO_BALANCE, hideZeroBalance.toString());
  },

  getHideZeroBalance: (): boolean => {
    return localStorage.getItem(UserSettings.HIDE_ZERO_BALANCE) === TRUE;
  },

  setStakingNetwork: (chainId: ChainId): void => {
    localStorage.setItem(UserSettings.STAKING_NETWORK, chainId);
  },

  getStakingNetwork: (): ChainId => {
    return (localStorage.getItem(UserSettings.STAKING_NETWORK) as ChainId) || '';
  },
});
