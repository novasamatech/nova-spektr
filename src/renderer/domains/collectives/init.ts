import { combine } from 'effector';

import { combineStores } from './_lib/service';
import { evidence } from './evidence/store';
import { feed } from './feed/store';
import { member } from './member/store';
import { referendum } from './referendum/store';
import { referendumMeta } from './referendumMeta/store';
import { rfc } from './rfc/store';
import { salary } from './salary/store';
import { track } from './tracks/store';
import { voting } from './votingHistory/store';

export const $collectiveStore = combine(
  {
    members: member.membersSubscriptionResource.$cache,
    referendums: referendum.$list,
    evidenceToReferendumRelations: evidence.evidenceToReferendumRelationsResource.$cache,
    referendumMeta: referendumMeta.referendumMetaResource.$cache,
    tracks: track.$list,
    maxRank: track.$maxRank,
    voting: voting.votingSubscriptionResource.$cache,
    salaryStatus: salary.salaryCycleResource.$cache,
    claimantStatus: salary.claimantStatusResource.$cache,
    evidence: evidence.evidenceResource.$cache,
    evidenceContent: evidence.evidenceContentResource.$cache,
    evidencePeriods: evidence.evidencePeriodResource.$cache,
    evidenceSummary: evidence.evidenceSummaryResource.$cache,
    feed: feed.feedSubscriptionResource.$cache,
    rfcSummary: rfc.rfcSummaryResource.$cache,
  },
  combineStores,
);
