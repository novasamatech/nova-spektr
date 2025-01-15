import { combine } from 'effector';

import { combineStores } from './_lib/helpers';
import { membersDomainModel } from './members/model';
import { membersService } from './members/service';
import { referendumDomainModel } from './referendum/model';
import { referendumService } from './referendum/service';
import { referendumMetaModel } from './referendumMeta/model';
import { tracksDomainModel } from './tracks/model';
import { tracksService } from './tracks/service';
import { votingService } from './voting/service';
import { votingDomainModel } from './votingHistory/model';

const $store = combine(
  {
    members: membersDomainModel.$list,
    referendums: referendumDomainModel.$list,
    referendumMeta: referendumMetaModel.$list,
    tracks: tracksDomainModel.$list,
    maxRank: tracksDomainModel.$maxRank,
    voting: votingDomainModel.$votes,
  },
  combineStores,
);

/**
 * @deprecated Use direct imports instead
 */
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
  votingService,
};

export {
  $store as $collectiveStore,
  membersDomainModel as members,
  tracksDomainModel as tracks,
  referendumDomainModel as referendums,
  referendumMetaModel as referendumMeta,
  votingDomainModel as voting,
  tracksService,
  membersService,
  referendumService,
  votingService,
};
