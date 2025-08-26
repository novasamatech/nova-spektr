import { dictionary } from '@/shared/lib/utils';
import { type CoreMember, type Member } from '../member/types';
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

function getReferendumsSinceLastProof(referendums: ReferendumMeta[], member: CoreMember): ReferendumMeta[] {
  return referendums.filter(r => r.created >= member.lastProof);
}

function getActivityInfo(referendums: ReferendumMeta[] | null, member: Member, maxRank: number, votes: Vote[] | null) {
  if (!referendums || !votes) return null;

  if (referendums.length === 0) return { activity: null, agreement: null };

  const possibleReferendums = referendums.filter(r =>
    trackService.rankSatisfiesVotingThreshold(member.rank, maxRank, r.track),
  );

  if (referendums.length > 0 && possibleReferendums.length === 0) {
    return { activity: 100, agreement: 100 };
  }

  let voted = 0;
  let agreementVote = 0;

  const memberVotes = votes.filter(v => v.accountId === member.accountId);
  const memberVotesMap = dictionary(memberVotes, 'referendumId');

  for (const referendum of possibleReferendums) {
    const memberVote = memberVotesMap[referendum.referendumId];

    if (!memberVote) continue;
    if (referendumMetaService.getReferendumVotingFromStatus(referendum) === memberVote.decision) agreementVote++;
    voted++;
  }

  const activity = possibleReferendums.length ? Math.round((voted / possibleReferendums.length) * 100) : 0;
  const agreement = voted ? Math.round((agreementVote / voted) * 100) : 0;

  return { activity, agreement };
}

export const referendumMetaService = {
  getReferendumVotingFromStatus,
  getReferendumsSinceLastProof,
  getActivityInfo,
};
