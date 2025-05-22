import { useStoreMap, useUnit } from 'effector-react';
import { type PropsWithChildren, memo, useState } from 'react';

import { useFlow } from '@/shared/effector';
import { useI18n } from '@/shared/i18n';
import { cnTw, nonNullable, nullable } from '@/shared/lib/utils';
import { ButtonCard, FootnoteText, type IconNames } from '@/shared/ui';
import { Box, Tooltip } from '@/shared/ui-kit';
import { type Evidence, type Referendum, referendumService, trackService } from '@/domains/collectives';
import { tasksService } from '@/features/fellowship-tasks';
import { fellowshipVotingFeature } from '../model/feature';
import { votingStatus } from '../model/votingStatus';
import { categorizeImpact } from '../utils';

import { VotingModal } from './VotingModal';

type Props = {
  referendum?: Referendum | null;
  evidence?: Evidence | null;
};

export const VotingButtons = memo(({ referendum }: Props) => {
  useFlow(votingStatus.flow, { referendumId: referendum?.id ?? null });

  const { t } = useI18n();

  const chain = useStoreMap(fellowshipVotingFeature.input, input => input?.chain ?? null);

  const canVote = useUnit(votingStatus.$canVote);
  const hasRequiredRank = useUnit(votingStatus.$hasRequiredRank);
  const voting = useUnit(votingStatus.$referendumVoting);
  const currentMember = useUnit(votingStatus.$currentMember);
  const accountsVotes = useUnit(votingStatus.$accountsVotes);
  const maxRank = useUnit(votingStatus.$maxRank);

  const [decision, setDecision] = useState<'aye' | 'nay' | null>(null);

  if (nullable(chain) || nullable(referendum) || referendumService.isCompleted(referendum) || nullable(currentMember)) {
    return null;
  }

  const referendumVote = accountsVotes.find(voting => voting.referendumId === referendum?.id);
  const totalReferendumVotes = referendum.tally.ayes + referendum.tally.nays;

  const buttonDiabled = !canVote || !hasRequiredRank;

  const alreadyVotedNay = nonNullable(voting) && voting.decision === 'Nay';
  const alreadyVotedAye = nonNullable(voting) && voting.decision === 'Aye';
  const isVoted = alreadyVotedNay || alreadyVotedAye;

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
    <>
      <VotingModal isOpen={nonNullable(decision)} vote={decision} onClose={() => setDecision(null)} />

      <Box gap={4}>
        <Box direction="row" gap={4}>
          <ButtonWithTooltip
            pallet="negative"
            icon="negative"
            disabled={buttonDiabled}
            votes={memberVoteWeight}
            voteImpact={userVotesImpact}
            isVoted={isVoted}
            marked={alreadyVotedNay}
            onClick={() => setDecision('nay')}
          >
            {alreadyVotedAye ? t('fellowship.voting.revote') : null}
            {t('fellowship.voting.notGood')}
          </ButtonWithTooltip>

          <ButtonWithTooltip
            pallet="positive"
            icon="positive"
            disabled={buttonDiabled}
            votes={memberVoteWeight}
            voteImpact={userVotesImpact}
            isVoted={isVoted}
            marked={alreadyVotedAye}
            onClick={() => setDecision('aye')}
          >
            {alreadyVotedNay ? t('fellowship.voting.revote') : null}
            {t('fellowship.voting.good')}
          </ButtonWithTooltip>
        </Box>

        {canVote && !hasRequiredRank ? (
          <FootnoteText className="text-center">{t('fellowship.voting.errors.rankThreshold')}</FootnoteText>
        ) : null}
      </Box>
    </>
  );
});

type ButtonTooltips = {
  pallet: 'positive' | 'negative';
  disabled: boolean;
  votes: number;
  voteImpact: number;
  icon: IconNames;
  onClick: () => void;
  isVoted: boolean;
  marked: boolean;
};

export const ButtonWithTooltip = ({
  pallet,
  disabled,
  onClick,
  votes,
  voteImpact,
  icon,
  children,
  isVoted,
  marked,
}: PropsWithChildren<ButtonTooltips>) => {
  const { t } = useI18n();

  const tooltipText = pallet === 'positive' ? t('voteChart.aye') : t('voteChart.nay');
  const impact = categorizeImpact(voteImpact);

  return (
    <Tooltip>
      <Tooltip.Trigger>
        <div className="w-full">
          <ButtonCard
            pallet={pallet}
            icon={icon}
            disabled={disabled}
            fullWidth
            className={cnTw(
              { 'bg-secondary-positive-button-background-active': marked && pallet === 'positive' },
              { 'bg-secondary-negative-button-background-active': marked && pallet === 'negative' },
              { 'px-2': isVoted },
            )}
            onClick={onClick}
          >
            {children}
          </ButtonCard>
        </div>
      </Tooltip.Trigger>
      <Tooltip.Content>
        <p>
          <span>
            {tooltipText}: {t('fellowship.votingHistory.votes', { count: votes })}
          </span>
          <br />
          <span>
            {t('fellowship.voting.voteImpact.impact')} {t(`fellowship.voting.voteImpact.${impact}`)}
          </span>
        </p>
      </Tooltip.Content>
    </Tooltip>
  );
};
