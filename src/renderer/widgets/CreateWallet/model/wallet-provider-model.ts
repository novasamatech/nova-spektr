import { createStore, createEvent, forward, sample, createApi, createEffect } from 'effector';
import { NavigateFunction } from 'react-router-dom';

import { WalletType } from '@renderer/shared/core';

const walletTypeSet = createEvent<WalletType | null>();
const modalClosed = createEvent();
const storeCleared = createEvent();
const completed = createEvent();
const rejected = createEvent();

const $walletType = createStore<WalletType | null>(null).reset([modalClosed, completed]);

type Navigation = {
  redirectPath: string;
  navigate: NavigateFunction;
};
const $navigation = createStore<Navigation | null>(null).reset(storeCleared);
const navigationApi = createApi($navigation, {
  navigateApiChanged: (state, { navigate, redirectPath }) => ({ ...state, navigate, redirectPath }),
});

const navigateFx = createEffect(({ navigate, redirectPath }: Navigation) => {
  navigate(redirectPath);
});

forward({ from: walletTypeSet, to: $walletType });

sample({
  clock: completed,
  source: $navigation,
  filter: (state): state is Navigation => Boolean(state?.redirectPath) && Boolean(state?.navigate),
  target: navigateFx,
});

export const walletProviderModel = {
  $walletType,
  events: {
    walletTypeSet,
    modalClosed,
    completed,
    rejected,
    navigateApiChanged: navigationApi.navigateApiChanged,
  },
};
