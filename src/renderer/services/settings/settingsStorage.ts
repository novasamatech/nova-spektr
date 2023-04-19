import { ChainID } from '@renderer/domain/shared-kernel';
import { UserSettings, TRUE } from './common/constants';
import { ISettingsStorage } from './common/types';

export const useSettingsStorage = (): ISettingsStorage => {
  const setHideZeroBalance = (hideZeroBalance: boolean) => {
    localStorage.setItem(UserSettings.HIDE_ZERO_BALANCE, hideZeroBalance.toString());
  };

  const getHideZeroBalance = (): boolean => {
    return localStorage.getItem(UserSettings.HIDE_ZERO_BALANCE) === TRUE;
  };

  const setStakingNetwork = (chainId: ChainID): void => {
    localStorage.setItem(UserSettings.STAKING_NETWORK, chainId);
  };

  const getStakingNetwork = (): ChainID => {
    return (localStorage.getItem(UserSettings.STAKING_NETWORK) as ChainID) || '';
  };

  return {
    setHideZeroBalance,
    getHideZeroBalance,
    setStakingNetwork,
    getStakingNetwork,
  };
};
