import { combine } from 'effector';

import { membersDomainModal } from './models/members';

const $store = combine({ members: membersDomainModal.$membersStore }, ({ members }) => ({ ...members }));

export const collectiveDomain = {
  $store,
};
