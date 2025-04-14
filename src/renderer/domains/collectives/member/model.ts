import { createStore } from 'effector';

import { deriveFromResources } from '@/shared/resource';
import { mergeNested } from '../_lib/helpers';
import { type CollectivesStruct } from '../_lib/types';

import { membersSubscription } from './resource';
import { type Member } from './types';

const $list = createStore<CollectivesStruct<Member[]>>({});

deriveFromResources({
  store: $list,
  resources: [membersSubscription],
  map(store, response) {
    return mergeNested(store, response, m => m.accountId);
  },
});

export const member = {
  $list,

  pending: membersSubscription.pending,
  subscribe: membersSubscription.subscribe,
  unsubscribe: membersSubscription.unsubscribe,
  fulfilled: membersSubscription.fulfilled,
};
