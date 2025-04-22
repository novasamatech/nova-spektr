import { createStore } from 'effector';
import { readonly } from 'patronum';

import { deriveFromResources } from '@/shared/resource';
import { mergeNested } from '../_lib/helpers';
import { type CollectivesStruct } from '../_lib/types';

import { membersSubscription } from './resource';
import { type Member } from './types';

const $list = createStore<CollectivesStruct<Member[]>>({});

deriveFromResources({
  store: $list,
  resources: [membersSubscription],
  map(store, members) {
    return mergeNested(
      store,
      members,
      m => m.accountId,
      (a, b) => b.rank - a.rank,
    );
  },
});

export const member = {
  $list: readonly($list),

  pending: membersSubscription.pending,
  subscribe: membersSubscription.subscribe,
  unsubscribe: membersSubscription.unsubscribe,
  receive: membersSubscription.receive,
  fulfilled: membersSubscription.fulfilled,
};
