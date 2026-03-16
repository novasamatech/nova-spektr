import { createEvent, createStore } from 'effector';
import { persist } from 'effector-storage/local';

import { AssetsListView } from '@/entities/asset';
import { ASSETS_PAGE_VIEW, HIDE_ZERO_BALANCES } from '../lib/constants';

const hideZeroBalancesChanged = createEvent<boolean>();
const assetsViewChanged = createEvent<AssetsListView>();
const assetsStarted = createEvent();

const $hideZeroBalances = createStore<boolean>(false);
const $assetsView = createStore<AssetsListView>(AssetsListView.TOKEN_CENTRIC);

persist({ key: HIDE_ZERO_BALANCES, store: $hideZeroBalances, sync: true });
persist({ key: ASSETS_PAGE_VIEW, store: $assetsView, sync: true });

$hideZeroBalances.on(hideZeroBalancesChanged, (_, value) => value);
$assetsView.on(assetsViewChanged, (_, value) => value);

export const assetsSettingsModel = {
  $assetsView,
  $hideZeroBalances,
  events: {
    hideZeroBalancesChanged,
    assetsViewChanged,
    assetsStarted,
  },
};
