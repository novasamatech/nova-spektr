import { combine } from 'effector';
import { pick } from 'lodash';

import { combineStores } from './lib/helpers';
import { membersDomainModel } from './models/members';

const $store = combine({ members: membersDomainModel.$members }, combineStores);

export const collectiveDomain = {
  $store,
  members: pick(membersDomainModel, ['subscribe', 'unsubscribe', 'pending', 'received']),
};
