import { combine } from 'effector';

import { combineStores } from './_lib/helpers';
import { evidence } from './evidence/store';
import { feed } from './feed/store';
import { member } from './member/store';
import { referendum } from './referendum/store';
import { referendumMeta } from './referendumMeta/store';
import { rfcDetails } from './rfc/store';
import { salary } from './salary/store';
import { track } from './tracks/store';
import { voting } from './votingHistory/store';

export const $collectiveStore = combine(
  {
    members: member.$list,
    referendums: referendum.$list,
    referendumsWithEvidence: referendum.$referendumsWithEvidence,
    referendumMeta: referendumMeta.$list,
    tracks: track.$list,
    maxRank: track.$maxRank,
    voting: voting.$votes,
    salaryStatus: salary.$status,
    claimantStatus: salary.$claimantStatus,
    evidence: evidence.$list,
    evidenceContent: evidence.$content,
    evidencePeriods: evidence.$periods,
    evidenceSummary: evidence.$summary,
    feed: feed.$list,
    rfcSummary: rfcDetails.$list,
  },
  combineStores,
);
