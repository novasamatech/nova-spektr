import { createStore, createEvent, sample, createApi, createEffect, forward } from 'effector';
import { NavigateFunction } from 'react-router-dom';

import { walletPairingModel } from '@features/wallets';

const completed = createEvent();
const rejected = createEvent();

type Navigation = {
  redirectPath: string;
  navigate: NavigateFunction;
};
const $navigation = createStore<Navigation | null>(null);
const navigationApi = createApi($navigation, {
  navigateApiChanged: (state, { navigate, redirectPath }) => ({ ...state, navigate, redirectPath }),
});

const navigateFx = createEffect(({ navigate, redirectPath }: Navigation) => {
  navigate(redirectPath);
});

sample({
  clock: completed,
  source: $navigation,
  filter: (state): state is Navigation => Boolean(state?.redirectPath) && Boolean(state?.navigate),
  target: navigateFx,
});

forward({ from: navigateFx.doneData, to: walletPairingModel.events.walletTypeCleared });

export const walletProviderModel = {
  events: {
    completed,
    rejected,
    navigateApiChanged: navigationApi.navigateApiChanged,
  },
};
