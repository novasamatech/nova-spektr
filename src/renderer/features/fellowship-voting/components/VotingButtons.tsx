import { useUnit } from 'effector-react';
import { memo, useMemo, useState } from 'react';

import { useFlow } from '@/shared/effector';
import { useI18n } from '@/shared/i18n';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { FootnoteText, SmallTitleText } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import {
  type Evidence,
  type OngoingReferendum,
  referendumService,
  trackService,
  useMaxRank,
  useTracks,
} from '@/domains/collectives';
import { accountService } from '@/domains/network';
import { useFellowshipAccount, useFellowshipMember } from '@/aggregates/fellowship-member';
import { useFellowshipApi, useFellowshipChain } from '@/aggregates/fellowship-network';
import { Card } from '@/features/fellowship-referendum-details';
import { tasksService } from '@/features/fellowship-tasks';
import { useIsVotingDisabled } from '../hooks/useIsVotingDisabled';
import { useProposer } from '../hooks/useProposer';
import { useReferendumVote } from '../hooks/useReferendumVote';
import { votingStatus } from '../model/votingStatus';

import { VotingButtonWithTooltip } from './VotingButtonWithTooltip';
import { VotingModal } from './VotingModal';

type Props = {
  referendum: OngoingReferendum | null;
  evidence: Evidence | null;
};

export const VotingButtons = memo(({ referendum, evidence }: Props) => {
  useFlow(votingStatus.flow, { referendumId: referendum?.id ?? null });

  const { t } = useI18n();

  const chain = useFellowshipChain();
  const api = useFellowshipApi();
  const { data: tracks } = useTracks({ palletType: 'fellowship', api });

  const { data: account } = useFellowshipAccount();

  const canVote = account ? accountService.hasPermissionToMakeActions(account) : false;

  const voting = useUnit(votingStatus.$referendumVoting);
  const { data: currentMember } = useFellowshipMember();

  const { data: proposerMember } = useProposer(referendum, evidence);

  const { data: maxRank } = useMaxRank({ palletType: 'fellowship', api });

  const { data: referendumVote } = useReferendumVote(referendum?.id);

  const isDisabled = useIsVotingDisabled(referendum);

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

  if (nullable(chain) || nullable(currentMember) || nullable(maxRank) || nullable(referendum)) {
    return null;
  }

  const hasRequiredRank = trackService.rankSatisfiesVotingThreshold(currentMember.rank, maxRank, referendum.track);
  const totalReferendumVotes = referendum.tally.ayes + referendum.tally.nays;

  const alreadyVotedNay = nonNullable(voting) && voting.decision === 'Nay';
  const alreadyVotedAye = nonNullable(voting) && voting.decision === 'Aye';

  const memberVoteWeight = trackService.getVoteWeight({
    pallet: 'fellowship',
    rank: currentMember.rank,
    maxRank,
    track: referendum.track,
  });

  const userVotesImpact =
    tasksService.getReferendumUserImportanceScore(
      totalReferendumVotes,
      referendumVote?.decision ? memberVoteWeight * 2 : memberVoteWeight,
    ) * 100;

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
              disabled={isDisabled}
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
              disabled={isDisabled}
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
