import { combine } from 'effector';

import { combineStores } from './_lib/helpers';
import { evidence } from './evidence/store';
import { feed } from './feed/store';
import { member } from './member/store';
import { referendum } from './referendum/store';
import { referendumMeta } from './referendumMeta/store';
import { rfc } from './rfc/store';
import { track } from './tracks/store';
import { voting } from './votingHistory/store';

export const $collectiveStore = combine(
  {
    members: member.membersSubscriptionResource.$cache,
    referendums: referendum.$list,
    referendumsWithEvidence: evidence.evidenceToReferendumRelationsResource.$cache,
    referendumMeta: referendumMeta.referendumMetaResource.$cache,
    tracks: track.$list,
    maxRank: track.$maxRank,
    voting: voting.votingSubscriptionResource.$cache,
    // salaryStatus: salary.$status,
    // claimantStatus: salary.$claimantStatus,
    // evidence: evidence.$list,
    // evidenceContent: evidence.$content,
    // evidencePeriods: evidence.$periods,
    // evidenceSummary: evidence.$summary,
    feed: feed.feedSubscriptionResource.$cache,
    rfcSummary: rfc.rfcSummaryResource.$cache,
  },
  combineStores,
);
