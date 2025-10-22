import { createEvent, createStore, sample } from 'effector';
import { once } from 'patronum';

import { type AnyAccount } from '@/domains/network';
import { walletSelect } from '@/aggregates/wallet-select';
import { assetsSearchModel, assetsSettingsModel, portfolioModel } from '@/features/assets';

const setVisibleAccounts = createEvent<AnyAccount[]>();

const $visibleAccounts = createStore<AnyAccount[]>([]);

sample({
  clock: [assetsSettingsModel.$assetsView, once(assetsSettingsModel.events.assetsStarted)],
  source: assetsSettingsModel.$assetsView,
  target: portfolioModel.events.activeViewChanged,
});

sample({
  clock: assetsSettingsModel.$hideZeroBalances,
  target: portfolioModel.events.hideZeroBalancesChanged,
});

sample({
  clock: assetsSearchModel.$query,
  target: portfolioModel.events.queryChanged,
});

sample({
  clock: [walletSelect.$selectedAccounts, setVisibleAccounts],
  target: $visibleAccounts,
});

export const assetsModel = {
  $visibleAccounts,

  setVisibleAccounts,
};
