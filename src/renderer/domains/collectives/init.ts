import { combine } from 'effector';

import { combineStores } from './_lib/helpers';
import { evidence } from './evidence/model';
import { evidenceService } from './evidence/service';
import { feed } from './feed/model';
import { members } from './members/model';
import { memberService } from './members/service';
import { referendum } from './referendum/model';
import { referendumService } from './referendum/service';
import { referendumMeta } from './referendumMeta/model';
import { salary } from './salary/model';
import { salaryService } from './salary/service';
import { tracks } from './tracks/model';
import { tracksService } from './tracks/service';
import { votingService } from './voting/service';
import { voting } from './votingHistory/model';

const $store = combine(
  {
    members: members.$list,
    referendums: referendum.$list,
    referendumMeta: referendumMeta.$list,
    tracks: tracks.$list,
    maxRank: tracks.$maxRank,
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
  members,
  tracks,
  referendum,
  referendumMeta,
  voting,

  tracksService,
  memberService,
  referendumService,
  votingService,
};

export {
  $store as $collectiveStore,
  members as members,
  tracks as tracks,
  referendum as referendum,
  referendumMeta,
  voting,
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
