import { combine } from 'effector';

import { combineStores } from './_lib/helpers';
import { evidence } from './evidence/model';
import { evidenceService } from './evidence/service';
import { feed } from './feed/model';
import { membersDomainModel } from './members/model';
import { memberService } from './members/service';
import { referendumDomainModel } from './referendum/model';
import { referendumService } from './referendum/service';
import { referendumMetaModel } from './referendumMeta/model';
import { salary } from './salary/model';
import { salaryService } from './salary/service';
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
    salaryStatus: salary.$status,
    evidence: evidence.$list,
    feed: feed.$list,
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
  membersService: memberService,
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
  salary,
  feed,
  evidence,
  evidenceService,
  tracksService,
  memberService,
  referendumService,
  votingService,
  salaryService,
};
