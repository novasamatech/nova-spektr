import { combine } from 'effector';

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
  members: membersDomainModel,
  tracks: tracksDomainModel,
  referendum: referendumDomainModel,
  referendumMeta: referendumMetaModel,
  voting: votingDomainModel,

  tracksService,
  membersService,
  referendumService,
};
