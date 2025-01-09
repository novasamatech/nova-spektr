import { combine } from 'effector';

import { combineStores } from './_lib/helpers';
import { membersDomainModel } from './members/model';
import { membersService } from './members/service';
import { referendumDomainModel } from './referendum/model';
import { referendumService } from './referendum/service';
import { referendumMetaModel } from './referendumMeta/model';
import { tracksDomainModel } from './tracks/model';
import { tracksService } from './tracks/service';
import { votesDomainModel } from './votes/model';
import { votingDomainModel } from './voting/model';
import { votingService } from './voting/service';

const $store = combine(
  {
    members: membersDomainModel.$list,
    referendums: referendumDomainModel.$list,
    referendumMeta: referendumMetaModel.$list,
    tracks: tracksDomainModel.$list,
    maxRank: tracksDomainModel.$maxRank,
    voting: votingDomainModel.$list,
    votes: votesDomainModel.$votes,
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
  votes: votesDomainModel,

  tracksService,
  membersService,
  referendumService,
  votingService,
};
