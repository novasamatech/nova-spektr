import { sample } from 'effector';

import { tracksModel } from '@entities/governance';
import { networkSelectorModel } from '../model/networkSelector';

sample({
  clock: networkSelectorModel.events.networkSelected,
  target: tracksModel.events.requestTracks,
});

export const tracksAggregate = {
  $tracks: tracksModel.$tracks,

  events: {
    requestTracks: tracksModel.events.requestTracks,
    requestDone: tracksModel.events.requestDone,
  },
};
