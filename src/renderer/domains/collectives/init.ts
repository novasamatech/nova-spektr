import { combine } from 'effector';

import { combineStores } from './_lib/helpers';
import { evidence } from './evidence/model';
import { evidenceService } from './evidence/service';
import { feed } from './feed/model';
import { member } from './members/model';
import { memberService } from './members/service';
import { referendum } from './referendum/model';
import { referendumService } from './referendum/service';
import { referendumMeta } from './referendumMeta/model';
import { salary } from './salary/model';
import { salaryService } from './salary/service';
import { track } from './tracks/model';
import { trackService } from './tracks/service';
import { votingService } from './voting/service';
import { voting } from './votingHistory/model';

const $store = combine(
  {
    members: member.$list,
    referendums: referendum.$list,
    referendumMeta: referendumMeta.$list,
    tracks: track.$list,
    maxRank: track.$maxRank,
    voting: voting.$votes,
    salaryStatus: salary.$status,
    claimantStatus: salary.$claimantStatus,
    evidence: evidence.$list,
    evidencePeriods: evidence.$periods,
    feed: feed.$list,
  },
  combineStores,
);

/**
 * @deprecated Use direct imports instead
 */
export const collectiveDomain = {
  $store,
  members: member,
  tracks: track,
  referendum,
  referendumMeta,
  voting,

  trackService,
  memberService,
  referendumService,
  votingService,
};

export {
  $store as $collectiveStore,
  member,
  track,
  referendum,
  referendumMeta,
  voting,
  salary,
  feed,
  evidence,
  evidenceService,
  trackService,
  memberService,
  referendumService,
  votingService,
  salaryService,
};
