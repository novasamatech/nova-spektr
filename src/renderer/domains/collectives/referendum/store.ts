import { readonly } from 'patronum';

import { fetchResource, subscriptionResource } from './resource';

export const referendum = {
  $list: readonly(subscriptionResource.$cache),
  request: fetchResource.fetch,
  subscribe: subscriptionResource.subscribe,
  unsubscribe: subscriptionResource.unsubscribe,
};
