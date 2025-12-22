import { createEvent, createStore } from 'effector';

import { FELLOWSHIP_TABS, type FellowshipTab } from './constants';

const openFellowshipOverviewModal = createEvent();
const closeFellowshipOverviewModal = createEvent();
const switchTab = createEvent<FellowshipTab>();

const $isFellowshipOverviewModalOpen = createStore(false)
  .on(openFellowshipOverviewModal, () => true)
  .on(closeFellowshipOverviewModal, () => false);

const $activeTab = createStore<FellowshipTab>(FELLOWSHIP_TABS.RANKS)
  .on(switchTab, (_, tab) => tab)
  .reset(closeFellowshipOverviewModal);

export const modal = {
  openFellowshipOverviewModal,
  closeFellowshipOverviewModal,
  switchTab,
  $isFellowshipOverviewModalOpen,
  $activeTab,
};
