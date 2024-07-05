import { sample } from 'effector';

import { tracksModel as tracksModelEntity } from '@entities/governance';
import { networkSelectorModel } from '../model/networkSelector';

sample({
  clock: networkSelectorModel.$governanceChainApi,
  source: networkSelectorModel.$governanceChain,
  filter: (chain, api) => !!chain && !!api,
  fn: (chain, api) => ({ api: api!, chain: chain! }),
  target: tracksModelEntity.events.requestTracks,
});

export const tracksAggregate = {
  $tracks: tracksModelEntity.$tracks,

  events: {
    requestDone: tracksModelEntity.events.requestDone,
  },
};
