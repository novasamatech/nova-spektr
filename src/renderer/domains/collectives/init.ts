import { createEvent, createStore, sample } from 'effector';

import { merge } from '@/shared/lib/utils';

import { updateStore } from './lib/helpers';
import { type CollectivePalletsType, type Store } from './lib/types';
import { membersModal } from './models/members';

const selectCollective = createEvent<CollectivePalletsType>();

const $store = createStore<Partial<Store>>({});

sample({
  clock: membersModal.events.requestDone,
  source: $store,
  fn: (store, { params, result }) => {
    const currentStore = store?.[params.palletType]?.[params.chainId] || {};
    const updatedField = { members: merge(currentStore.members || [], result, x => x?.accountId) };

    return updateStore(store, params, updatedField);
  },
  target: $store,
});

export const collectiveDomain = {
  $store,

  events: {
    selectCollective,
  },
};
