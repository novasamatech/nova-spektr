import { createStore } from 'effector';
import { readonly } from 'patronum';

import { deriveFromResources } from '@/shared/resource';
import { mergeNested } from '../_lib/helpers';
import { type CollectivesStruct } from '../_lib/types';

import { fetchResource, subscriptionResource } from './resource';
import { type Referendum } from './types';

const $list = createStore<CollectivesStruct<Referendum[]>>({});

deriveFromResources({
  store: $list,
  resources: [fetchResource, subscriptionResource],
  map(state, referendums) {
    return mergeNested(state, referendums, r => r.id);
  },
});

export const referendum = {
  $list: readonly($list),
  request: fetchResource.request,
  subscribe: subscriptionResource.subscribe,
  unsubscribe: subscriptionResource.unsubscribe,
  fulfilled: subscriptionResource.fulfilled,
};
