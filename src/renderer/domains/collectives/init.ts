import { combine } from 'effector';
import { pick } from 'lodash';

import { combineStores } from './lib/helpers';
import { membersDomainModel } from './models/members/model';
import { membersService } from './models/members/service';
import { referendumDomainModel } from './models/referendum/model';
import { referendumService } from './models/referendum/service';
import { tracksDomainModel } from './models/tracks/model';

const $store = combine(
  {
    members: membersDomainModel.$list,
    referendums: referendumDomainModel.$list,
    tracks: tracksDomainModel.$list,
  },
  combineStores,
);

export const collectiveDomain = {
  $store,
  members: {
    service: membersService,
    ...pick(membersDomainModel, ['pending', 'subscribe', 'unsubscribe', 'pending', 'received']),
  },
  tracks: {
    ...pick(tracksDomainModel, ['fulfilled', 'pending', 'request']),
  },
  referendum: {
    service: referendumService,
    ...pick(referendumDomainModel, ['pending', 'subscribe', 'unsubscribe', 'pending', 'received']),
  },
};
