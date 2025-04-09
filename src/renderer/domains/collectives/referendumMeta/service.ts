import { dictionary } from '@/shared/lib/utils';
import { type CoreMember } from '../member/types';
import { trackService } from '../tracks/service';
import { type Vote } from '../votingHistory/types';

import { type ReferendumMeta } from './types';

function getReferendumVotingFromStatus(referendum: ReferendumMeta) {
  switch (referendum.status) {
    case 'Executed':
    case 'Approved':
    case 'Confirmed':
    case 'Submitted':
      return 'Aye';

    case 'Rejected':
      return 'Nay';
  }
}

function getReferendumsSinceLastProof(
  referendums: ReferendumMeta[],
  member: CoreMember,
  maxRank: number,
): ReferendumMeta[] {
  return referendums.filter(r => {
    return r.created >= member.lastProof && trackService.rankSatisfiesVotingThreshold(member.rank, maxRank, r.track);
  });
}

function getActivityInfo(referendums: ReferendumMeta[], votes: Vote[]) {
  if (referendums.length === 0) return { activity: null, agreement: null };

  let voted = 0;
  let agreementVote = 0;

  const memberVotesMap = dictionary(votes, 'referendumId');

  for (const referendum of referendums) {
    const memberVote = memberVotesMap[referendum.referendumId];

    if (!memberVote) continue;
    if (referendumMetaService.getReferendumVotingFromStatus(referendum) === memberVote.decision) agreementVote++;
    voted++;
  }

  const activity = referendums.length ? Math.round((voted / referendums.length) * 100) : 0;
  const agreement = voted ? Math.round((agreementVote / voted) * 100) : 0;

  return { activity, agreement };
}

export const referendumMetaService = {
  getReferendumVotingFromStatus,
  getReferendumsSinceLastProof,
  getActivityInfo,
};
