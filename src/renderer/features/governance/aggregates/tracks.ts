import { sample } from 'effector';

import { tracksModel } from '@entities/governance';

import { networkSelectorModel } from '../model/networkSelector';

sample({
  clock: networkSelectorModel.$governanceChainApi,
  source: networkSelectorModel.$governanceChain,
  filter: (chain, api) => !!chain && !!api,
  fn: (chain, api) => ({ api: api!, chain: chain! }),
  target: tracksModel.events.requestTracks,
});

export const tracksAggregate = {
  $tracks: tracksModel.$tracks,

  events: {
    requestTracks: tracksModel.events.requestTracks,
    requestDone: tracksModel.events.requestDone,
  },
};
