import { membersSubscription } from './resource';

export const member = {
  $list: membersSubscription.$cache,
  resource: membersSubscription,
};
