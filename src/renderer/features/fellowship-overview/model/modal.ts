import { createEvent, createStore } from 'effector';

export const openFellowshipOverviewModal = createEvent();
export const closeFellowshipOverviewModal = createEvent();

export const $isFellowshipOverviewModalOpen = createStore(false)
  .on(openFellowshipOverviewModal, () => true)
  .on(closeFellowshipOverviewModal, () => false);