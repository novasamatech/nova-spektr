import { combine } from 'effector';

import { combineStores } from './_lib/helpers';
import { evidence } from './evidence/model';
import { feed } from './feed/model';
import { member } from './member/model';
import { referendum } from './referendum/model';
import { referendumMeta } from './referendumMeta/model';
import { salary } from './salary/model';
import { track } from './tracks/model';
import { voting } from './votingHistory/model';

export const $collectiveStore = combine(
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
    evidenceSummary: evidence.$summary,
    feed: feed.$list,
  },
  combineStores,
);
