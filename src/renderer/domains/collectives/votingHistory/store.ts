import { createStore } from 'effector';
import { readonly } from 'patronum';

import { deriveFromResources } from '@/shared/resource';
import { mergeNested } from '../_lib/helpers';
import { type CollectivesStruct } from '../_lib/types';

import { requestAllResource, requestResource, subscribeResource } from './resource';
import { type Vote } from './types';

const $votes = createStore<CollectivesStruct<Vote[]>>({});

deriveFromResources({
  store: $votes,
  resources: [subscribeResource, requestResource, requestAllResource],
  map(state, votes) {
    return mergeNested(state, votes, v => `${v.accountId}:${v.referendumId}`);
  },
});

export const voting = {
  $votes: readonly($votes),

  subscribeAccountsVoting: subscribeResource.subscribe,
  unsubscribeAccountsVoting: subscribeResource.unsubscribe,
  receive: subscribeResource.receive,
  request: requestResource.request,
  requestAll: requestAllResource.request,
};
