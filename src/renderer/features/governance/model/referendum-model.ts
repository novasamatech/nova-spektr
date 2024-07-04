import { sample } from 'effector';

import { referendumModel as referendumModelEntity } from '@entities/governance';
import { networkSelectorModel } from './network-selector-model';

sample({
  clock: networkSelectorModel.$governanceChainApi,
  source: {
    chain: networkSelectorModel.$governanceChain,
  },
  filter: (_, api) => !!api,
  fn: ({ chain }, api) => ({ api: api!, chain: chain! }),
  target: referendumModelEntity.events.requestReferendums,
});

export const referendumModel = {
  $referendums: referendumModelEntity.$referendums,
  $requestPending: referendumModelEntity.$isReferendumsLoading,
  effects: {
    requestReferendumsFx: referendumModelEntity.effects.requestReferendumsFx,
  },
  events: {
    requestDone: referendumModelEntity.events.requestDone,
  },
};
