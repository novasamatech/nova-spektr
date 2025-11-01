import { createStore } from 'effector';

import { membersSubscription } from './resource';

export const member = {
  $list: membersSubscription.$cache,
  resource: membersSubscription,
  subscribe: membersSubscription.start,
  unsubscribe: membersSubscription.stop,
  receive: membersSubscription.push,
  pending: createStore(false),
};
