import { useStoreMap, useUnit } from 'effector-react';
import { memo, useMemo, useState } from 'react';

import { useFlow } from '@/shared/effector';
import { useI18n } from '@/shared/i18n';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { FootnoteText, SmallTitleText } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { type Evidence, type Referendum, referendumService, track, trackService } from '@/domains/collectives';
import { Card } from '@/features/fellowship-referendum-details';
import { tasksService } from '@/features/fellowship-tasks';
import { fellowshipVotingFeature } from '../model/feature';
import { members } from '../model/members';
import { votingStatus } from '../model/votingStatus';

import { VotingButtonWithTooltip } from './VotingButtonWithTooltip';
import { VotingModal } from './VotingModal';

type Props = {
  referendum?: Referendum | null;
  evidence?: Evidence | null;
};

export const VotingButtons = memo(({ referendum, evidence }: Props) => {
  useFlow(votingStatus.flow, { referendumId: referendum?.id ?? null });

  const { t } = useI18n();

  const input = useUnit(fellowshipVotingFeature.input);
  const tracks = useUnit(track.$list);

  const chain = useStoreMap(fellowshipVotingFeature.input, input => input?.chain ?? null);

  const canVote = useUnit(votingStatus.$canVote);
  const hasRequiredRank = useUnit(votingStatus.$hasRequiredRank);
  const voting = useUnit(votingStatus.$referendumVoting);
  const currentMember = useUnit(votingStatus.$currentMember);
  const accountsVotes = useUnit(votingStatus.$accountsVotes);
  const maxRank = useUnit(votingStatus.$maxRank);

  const [decision, setDecision] = useState<'aye' | 'nay' | null>(null);

  const proposerMember = useStoreMap({
    store: members.$list,
    keys: [referendum, evidence],
    fn: (members, [referendum, evidence]) => {
      if (nonNullable(referendum) && referendumService.isOngoing(referendum)) {
        const proposer = referendumService.getProposer(referendum);
        return members.find(m => m.accountId === proposer) ?? null;
      }

      if (nonNullable(evidence)) {
        return members.find(m => m.accountId === evidence?.accountId) ?? null;
      }

      return null;
    },
  });

  const title = useMemo(() => {
    if (!referendum || !referendumService.isOngoing(referendum)) return '';

    const relatedTracks = input ? tracks.fellowship?.[input.chainId] : null;
    const isPromotion = evidence?.wish === 'Promotion' || trackService.isPromotionTrack(referendum.track);

    if (!relatedTracks || !proposerMember) return '';

    const trackName = isPromotion ? 'Promotion' : 'Retention';

    if (referendum.proposal && referendumService.isEvidenceProposal(referendum.proposal)) {
      return t('fellowship.tasks.titles.votingTitle.rank', {
        rank: trackService.getProposalTrack(relatedTracks, proposerMember, trackName),
      });
    }

    if (referendum.proposal && referendumService.isSpendProposal(referendum.proposal)) {
      return t('fellowship.tasks.titles.votingTitle.spend');
    }

    return t('fellowship.tasks.titles.votingTitle.rfcOrWhitelist');
  }, [referendum, input, tracks]);

  if (nullable(chain) || nullable(referendum) || referendumService.isCompleted(referendum) || nullable(currentMember)) {
    return null;
  }

  const referendumVote = accountsVotes.find(voting => voting.referendumId === referendum?.id);
  const totalReferendumVotes = referendum.tally.ayes + referendum.tally.nays;

  const buttonDiabled = !canVote || !hasRequiredRank;

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
        <VotingModal isOpen={nonNullable(decision)} vote={decision} onClose={() => setDecision(null)} />

        <Box gap={4}>
          <Box direction="row" gap={4}>
            <VotingButtonWithTooltip
              variant="negative"
              icon="negative"
              disabled={buttonDiabled}
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
              disabled={buttonDiabled}
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
