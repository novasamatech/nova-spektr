import { sample } from 'effector';

import { tracksModel as tracksModelEntity } from '@entities/governance';
import { networkSelectorModel } from './network-selector-model';

sample({
  clock: networkSelectorModel.$governanceChainApi,
  source: networkSelectorModel.$governanceChain,
  filter: (chain, api) => !!chain && !!api,
  fn: (chain, api) => ({ api: api!, chain: chain! }),
  target: tracksModelEntity.events.requestTracks,
});

networkSelectorModel.$governanceChain.watch((x) => console.log('$governanceChain', x));
networkSelectorModel.$governanceChainApi.watch((x) => console.log('$governanceChainApi', x));
tracksModelEntity.events.requestTracks.watch((x) => console.log('call track load', x));

export const tracksModel = {
  $tracks: tracksModelEntity.$tracks,

  events: {
    requestDone: tracksModelEntity.events.requestDone,
  },
};
