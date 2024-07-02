import { sample } from 'effector';
import { createGate } from 'effector-react';

import type { Chain } from '@shared/core';
import { networkSelectorModel, referendumListModel } from '@features/governance';
import { governanceModel } from '@entities/governance';

const governanceFlow = createGate();

sample({
  clock: governanceFlow.open,
  target: networkSelectorModel.input.defaultChainSet,
});

sample({
  source: networkSelectorModel.$governanceChain,
  filter: (chain): chain is Chain => Boolean(chain),
  target: referendumListModel.input.chainChanged,
});

export const governancePageModel = {
  // TODO: will be filtered in upcoming tasks
  $ongoing: governanceModel.$ongoingReferendums,
  $completed: governanceModel.$completedReferendums,

  gates: {
    governanceFlow,
  },
};
