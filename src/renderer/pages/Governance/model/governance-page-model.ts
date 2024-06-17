import { createEvent, sample } from 'effector';

import type { ReferendumId, Chain } from '@shared/core';
import { networkSelectorModel, referendumListModel, referendumDetailsModel } from '@features/governance';
import { governanceModel } from '@entities/governance';

const flowStarted = createEvent();
const referendumSelected = createEvent<ReferendumId>();

// const $filteredReferendums = createStore<Record<ReferendumId, ReferendumInfo>>({});

sample({
  clock: flowStarted,
  target: networkSelectorModel.input.defaultChainSet,
});

sample({
  source: networkSelectorModel.$governanceChain,
  filter: (chain): chain is Chain => Boolean(chain),
  target: referendumListModel.input.chainChanged,
});

sample({
  clock: referendumSelected,
  source: networkSelectorModel.$governanceChain,
  filter: (chain: Chain | null): chain is Chain => Boolean(chain),
  fn: ({ chainId }, index) => ({ chainId, index }),
  target: referendumDetailsModel.input.flowStarted,
});

export const governancePageModel = {
  // TODO: will be filtered in upcoming tasks
  $ongoing: governanceModel.$ongoingReferendums,
  $completed: governanceModel.$completedReferendums,

  events: {
    flowStarted,
    referendumSelected,
  },
};
