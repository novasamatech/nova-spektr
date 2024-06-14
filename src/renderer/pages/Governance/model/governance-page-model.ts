import { createEvent, createStore, sample } from 'effector';

import type { ChainId, ReferendumId } from '@shared/core';
import { referendumListModel, referendumDetailsModel } from '@features/governance';
import { governanceModel } from '@entities/governance';
import { networkModel } from '@entities/network';

const componentMounted = createEvent();
const referendumSelected = createEvent<ReferendumId>();

// const $filteredReferendums = createStore<Record<ReferendumId, ReferendumInfo>>({});
const $chainId = createStore<ChainId>('0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3');

sample({
  clock: componentMounted,
  source: networkModel.$chains,
  fn: (chains) => chains['0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3'],
  target: referendumListModel.events.chainChanged,
});

sample({
  clock: referendumSelected,
  source: $chainId,
  fn: (chainId, index) => ({ chainId, index }),
  target: referendumDetailsModel.input.flowStarted,
});

// sample({
//   clock: referendumListModel.output.referendumSelected,
//   target: referendumDetailsModel.events.referendumChanged,
// });

export const governancePageModel = {
  // TODO: will be filtered in upcoming tasks
  $ongoing: governanceModel.$ongoingReferendums,
  $completed: governanceModel.$completedReferendums,

  events: {
    componentMounted,
    referendumSelected,
  },
};
