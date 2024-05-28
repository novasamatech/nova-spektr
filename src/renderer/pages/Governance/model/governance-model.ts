import { createEvent, createStore, sample } from 'effector';

import type { ChainId } from '@shared/core';
import { referendumListModel } from '@features/governance';

const componentMounted = createEvent();

// const $filteredReferendums = createStore<Record<ReferendumId, ReferendumInfo>>({});
const $chainId = createStore<ChainId>('0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3');

sample({
  clock: componentMounted,
  source: $chainId,
  target: referendumListModel.events.chainIdChanged,
});

// sample({
//   clock: referendumListModel.output.referendumSelected,
//   target: referendumDetailsModel.events.referendumChanged,
// });

export const governanceModel = {
  // TODO: will be filtered in upcoming tasks
  $ongoing: referendumListModel.$ongoingReferendums,
  $completed: referendumListModel.$completedReferendums,

  events: {
    componentMounted,
  },
};
