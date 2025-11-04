import { memo, useMemo, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { FootnoteText, SmallTitleText } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import {
  type Evidence,
  type OngoingReferendum,
  referendumService,
  trackService,
  useTracks,
} from '@/domains/collectives';
import { useFellowshipApi, useFellowshipChain } from '@/aggregates/fellowship-network';
import { Card } from '@/features/fellowship-referendum-details';
import { useCanVoteForReferendum } from '../hooks/useCanVoteForReferendum';
import { useMemberVoteInfo } from '../hooks/useMemberVoteInfo';
import { useProposer } from '../hooks/useProposer';
import { useReferendumVote } from '../hooks/useReferendumVote';

import { VotingButtonWithTooltip } from './VotingButtonWithTooltip';
import { VotingModal } from './VotingModal';

type Props = {
  referendum: OngoingReferendum | null;
  evidence: Evidence | null;
};

export const VotingButtons = memo(({ referendum, evidence }: Props) => {
  const { t } = useI18n();

  const chain = useFellowshipChain();
  const api = useFellowshipApi();

  const { data: tracks } = useTracks({ palletType: 'fellowship', api });
  const { data: proposerMember } = useProposer(referendum, evidence);
  const { data: vote } = useReferendumVote(referendum);

  const { memberVoteWeight, userVotesImpact, hasRequiredRank } = useMemberVoteInfo(referendum);

  const canVote = useCanVoteForReferendum(referendum);

  const [decision, setDecision] = useState<'aye' | 'nay' | null>(null);

  const title = useMemo(() => {
    if (nullable(chain) || nullable(referendum) || !referendumService.isOngoing(referendum)) return '';

    const isPromotion = evidence?.wish === 'Promotion' || trackService.isPromotionTrack(referendum.track);

    if (!proposerMember) return '';

    const trackName = isPromotion ? 'Promotion' : 'Retention';

    if (referendum.proposal && referendumService.isEvidenceProposal(referendum.proposal)) {
      return t('fellowship.tasks.titles.votingTitle.rank', {
        rank: trackService.getProposalTrack(tracks, proposerMember, trackName),
      });
    }

    if (referendum.proposal && referendumService.isSpendProposal(referendum.proposal)) {
      return t('fellowship.tasks.titles.votingTitle.spend');
    }

    return t('fellowship.tasks.titles.votingTitle.rfcOrWhitelist');
  }, [referendum, chain, tracks]);

  if (nullable(referendum) || nullable(userVotesImpact)) {
    return null;
  }

  const alreadyVotedNay = nonNullable(vote) && vote.decision === 'Nay';
  const alreadyVotedAye = nonNullable(vote) && vote.decision === 'Aye';

  return (
    <Card>
      <Box padding={6} gap={6}>
        <SmallTitleText>{title}</SmallTitleText>
        <VotingModal
          referendum={referendum}
          isOpen={nonNullable(decision)}
          vote={decision}
          onClose={() => setDecision(null)}
        />

        <Box gap={4}>
          <Box direction="row" gap={4}>
            <VotingButtonWithTooltip
              variant="negative"
              icon="negative"
              disabled={!canVote}
              votes={memberVoteWeight}
              voteImpact={userVotesImpact}
              isVoted={alreadyVotedNay}
              checked={alreadyVotedNay}
              fullWidth
              onClick={() => !alreadyVotedNay && setDecision('nay')}
            >
              {t('fellowship.voting.notGood')}
            </VotingButtonWithTooltip>

            <VotingButtonWithTooltip
              variant="positive"
              icon="positive"
              disabled={!canVote}
              votes={memberVoteWeight}
              voteImpact={userVotesImpact}
              isVoted={alreadyVotedAye}
              checked={alreadyVotedAye}
              fullWidth
              onClick={() => !alreadyVotedAye && setDecision('aye')}
            >
              {t('fellowship.voting.good')}
            </VotingButtonWithTooltip>
          </Box>

          {canVote && !hasRequiredRank ? (
            <FootnoteText className="text-center">{t('fellowship.voting.errors.rankThreshold')}</FootnoteText>
          ) : null}
        </Box>
      </Box>
    </Card>
  );
});
