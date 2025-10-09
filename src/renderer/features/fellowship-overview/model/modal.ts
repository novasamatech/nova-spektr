import { createEvent, createStore } from 'effector';

import { FELLOWSHIP_TABS, type FellowshipTab } from './constants';

export const openFellowshipOverviewModal = createEvent();
export const closeFellowshipOverviewModal = createEvent();
export const switchTab = createEvent<FellowshipTab>();

export const $isFellowshipOverviewModalOpen = createStore(false)
  .on(openFellowshipOverviewModal, () => true)
  .on(closeFellowshipOverviewModal, () => false);

export const $activeTab = createStore<FellowshipTab>(FELLOWSHIP_TABS.RANKS)
  .on(switchTab, (_, tab) => tab)
  .reset(closeFellowshipOverviewModal);
