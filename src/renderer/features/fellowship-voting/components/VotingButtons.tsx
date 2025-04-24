import { useStoreMap, useUnit } from 'effector-react';
import { type PropsWithChildren, memo, useState } from 'react';

import { useFlow } from '@/shared/effector';
import { useI18n } from '@/shared/i18n';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { type ReferendumId } from '@/shared/pallet/referenda';
import { ButtonCard, FootnoteText, type IconNames } from '@/shared/ui';
import { Box, Tooltip } from '@/shared/ui-kit';
import { referendumService, trackService } from '@/domains/collectives';
import { tasksService } from '@/features/fellowship-tasks';
import { fellowshipVotingFeature } from '../model/feature';
import { votingStatus } from '../model/votingStatus';
import { categorizeImpact } from '../utils';

import { VotingModal } from './VotingModal';

type Props = {
  referendumId: ReferendumId;
  onHighlight: (value: 'Aye' | 'Nay' | null) => void;
};

export const VotingButtons = memo(({ referendumId, onHighlight }: Props) => {
  useFlow(votingStatus.flow, { referendumId });

  const { t } = useI18n();

  const chain = useStoreMap(fellowshipVotingFeature.input, input => input?.chain ?? null);
  const referendum = useUnit(votingStatus.$referendum);
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

  const renderAyeButton = nullable(voting) || voting.decision !== 'Aye';
  const renderNayButton = nullable(voting) || voting.decision !== 'Nay';

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
          {renderNayButton ? (
            <ButtonWithTooltip
              pallet="negative"
              icon="thumbDown"
              disabled={buttonDiabled}
              votes={memberVoteWeight}
              voteImpact={userVotesImpact}
              onClick={() => setDecision('nay')}
              onHighlight={onHighlight}
            >
              {t('fellowship.voting.nay')}
            </ButtonWithTooltip>
          ) : null}

          {renderAyeButton ? (
            <ButtonWithTooltip
              pallet="positive"
              icon="thumbUp"
              disabled={buttonDiabled}
              votes={memberVoteWeight}
              voteImpact={userVotesImpact}
              onClick={() => setDecision('aye')}
              onHighlight={onHighlight}
            >
              {t('fellowship.voting.aye')}
            </ButtonWithTooltip>
          ) : null}
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
  onHighlight: (value: 'Aye' | 'Nay' | null) => void;
};

export const ButtonWithTooltip = ({
  pallet,
  disabled,
  onClick,
  onHighlight,
  votes,
  voteImpact,
  icon,
  children,
}: PropsWithChildren<ButtonTooltips>) => {
  const { t } = useI18n();

  const tooltipText = pallet === 'positive' ? t('voteChart.aye') : t('voteChart.nay');
  const impact = categorizeImpact(voteImpact);

  return (
    <Tooltip>
      <Tooltip.Trigger>
        <div
          className="w-full"
          onMouseOver={() => onHighlight(pallet === 'positive' ? 'Aye' : 'Nay')}
          onMouseLeave={() => onHighlight(null)}
        >
          <ButtonCard pallet={pallet} icon={icon} disabled={disabled} fullWidth onClick={onClick}>
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
