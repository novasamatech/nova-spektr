import { combine } from 'effector';
import { pick } from 'lodash';

import { combineStores } from './lib/helpers';
import { membersDomainModel } from './model/members/model';
import { membersService } from './model/members/service';
import { referendumDomainModel } from './model/referendum/model';
import { referendumService } from './model/referendum/service';
import { referendumMetaModel } from './model/referendumMeta/model';
import { tracksDomainModel } from './model/tracks/model';
import { tracksService } from './model/tracks/service';
import { votingDomainModel } from './model/voting/model';

const $store = combine(
  {
    members: membersDomainModel.$list,
    referendums: referendumDomainModel.$list,
    referendumMeta: referendumMetaModel.$list,
    tracks: tracksDomainModel.$list,
    maxRank: tracksDomainModel.$maxRank,
    voting: votingDomainModel.$list,
  },
  combineStores,
);

export const collectiveDomain = {
  $store,
  members: {
    service: membersService,
    ...pick(membersDomainModel, ['subscribe', 'unsubscribe', 'pending', 'fulfilled', 'received']),
  },
  tracks: {
    service: tracksService,
    ...pick(tracksDomainModel, ['request', 'fulfilled', 'pending']),
  },
  referendum: {
    service: referendumService,
    ...pick(referendumDomainModel, ['subscribe', 'unsubscribe', 'pending', 'fulfilled', 'received']),
  },
  referendumMeta: {
    ...pick(referendumMetaModel, ['request', 'pending', 'fulfilled']),
  },
  voting: {
    ...pick(votingDomainModel, ['subscribe', 'unsubscribe', 'pending']),
  },
};
