import { combine } from 'effector';

import { combineStores } from './lib/helpers';
import { membersDomainModel } from './models/members';

const $store = combine({ members: membersDomainModel.$membersStore }, ({ members }) =>
  combineStores({
    members,
  }),
);

export const collectiveDomain = {
  $store,
};
