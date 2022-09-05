import { HIDE_ZERO_BALANCE_KEY, TRUE } from './common/constants';
import { ISettingsStorage } from './common/types';

export const useSettingsStorage = (): ISettingsStorage => ({
  setHideZeroBalance: (hideZeroBalance: boolean) => {
    localStorage.setItem(HIDE_ZERO_BALANCE_KEY, hideZeroBalance.toString());
  },
  getHideZeroBalance: (): boolean => {
    return localStorage.getItem(HIDE_ZERO_BALANCE_KEY) === TRUE;
  },
});
