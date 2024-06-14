import { createEvent, sample } from 'effector';

import type { ReferendumId, Chain } from '@shared/core';
import { networkSelectorModel, referendumListModel } from '@features/governance';
import { governanceModel } from '@entities/governance';
import { networkModel } from '@entities/network';

const flowStarted = createEvent();
const referendumSelected = createEvent<ReferendumId>();

// const $filteredReferendums = createStore<Record<ReferendumId, ReferendumInfo>>({});
const $chainId = createStore<ChainId>('0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3');

sample({
  clock: flowStarted,
  target: networkSelectorModel.input.defaultChainSet,
});

sample({
  source: networkSelectorModel.$governanceChain,
  filter: (chain): chain is Chain => Boolean(chain),
  target: referendumListModel.input.chainChanged,
});

// sample({
//   clock: referendumSelected,
//   source: $chainId,
//   fn: (chainId, index) => ({ chainId, index }),
//   target: referendumDetailsModel.input.flowStarted,
// });

// sample({
//   clock: referendumListModel.output.referendumSelected,
//   target: referendumDetailsModel.events.referendumChanged,
// });

export const governancePageModel = {
  // TODO: will be filtered in upcoming tasks
  $ongoing: governanceModel.$ongoingReferendums,
  $completed: governanceModel.$completedReferendums,

  events: {
    flowStarted,
    referendumSelected,
  },
};
