import { createEvent, sample } from 'effector';

import { referendumListModel, referendumDetailsModel } from '@features/governance';
import { ChainId } from '@shared/core';

const requestStarted = createEvent();

sample({
  clock: requestStarted,
  fn: () => '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3' as ChainId,
  target: referendumListModel.events.chainIdChanged,
});

sample({
  clock: referendumListModel.output.referendumSelected,
  target: referendumDetailsModel.events.referendumChanged,
});

export const governanceModel = {
  events: {
    requestStarted,
  },
};
