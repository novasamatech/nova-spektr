import { createEffect, createEvent, createStore, sample } from 'effector';

import { localStorageService } from '@shared/api/local-storage';
import { AssetsPageView } from '@entities/asset';
import { ASSETS_PAGE_VIEW, HIDE_ZERO_BALANCES } from '../lib/constants';

const hideZeroBalancesChanged = createEvent<boolean>();
const assetsViewChanged = createEvent<AssetsPageView>();
const assetsStarted = createEvent();

const $hideZeroBalances = createStore<boolean>(false);
const $assetsView = createStore<AssetsPageView>(AssetsPageView.TOKEN_CENTRIC);

const getAssetsViewFx = createEffect((): AssetsPageView => {
  return localStorageService.getFromStorage(ASSETS_PAGE_VIEW, AssetsPageView.TOKEN_CENTRIC);
});

const saveAssetsViewFx = createEffect((value: AssetsPageView): AssetsPageView => {
  return localStorageService.saveToStorage(ASSETS_PAGE_VIEW, value);
});

const getHideZeroBalancesFx = createEffect((): boolean => {
  return localStorageService.getFromStorage(HIDE_ZERO_BALANCES, false);
});

const saveHideZeroBalancesFx = createEffect((value: boolean): boolean => {
  return localStorageService.saveToStorage(HIDE_ZERO_BALANCES, value);
});

sample({
  clock: assetsStarted,
  target: [getHideZeroBalancesFx, getAssetsViewFx],
});

sample({
  clock: hideZeroBalancesChanged,
  target: saveHideZeroBalancesFx,
});

sample({
  clock: [saveHideZeroBalancesFx.doneData, getHideZeroBalancesFx.doneData],
  target: $hideZeroBalances,
});

sample({
  clock: assetsViewChanged,
  target: saveAssetsViewFx,
});

sample({
  clock: [saveAssetsViewFx.doneData, getAssetsViewFx.doneData],
  target: $assetsView,
});

export const assetsSettingsModel = {
  $assetsView,
  $hideZeroBalances,
  events: {
    hideZeroBalancesChanged,
    assetsViewChanged,
    assetsStarted,
  },
};
