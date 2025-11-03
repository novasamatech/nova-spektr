import { memo } from 'react';

import { useFlow } from '@/shared/effector';
import { useI18n } from '@/shared/i18n';
import { cnTw, nonNullable, nullable } from '@/shared/lib/utils';
import { SmallTitleText } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { type Evidence, type Referendum } from '@/domains/collectives';
import { Card } from '@/features/fellowship-referendum-details';
import { useReferendumVote } from '../hooks/useReferendumVote';
import { votingStatus } from '../model/votingStatus';

import { VotingButtonWithTooltip } from './VotingButtonWithTooltip';

type Props = {
  referendum?: Referendum | null;
  evidence?: Evidence | null;
};

export const VotingButtonsCompleted = memo(({ referendum }: Props) => {
  useFlow(votingStatus.flow, { referendumId: referendum?.id ?? null });

  const { t } = useI18n();

  const { data: referendumVote } = useReferendumVote(referendum?.id);

  if (nullable(referendum)) {
    return null;
  }

  const alreadyVotedNay = nonNullable(referendumVote) && referendumVote.decision === 'Nay';
  const alreadyVotedAye = nonNullable(referendumVote) && referendumVote.decision === 'Aye';

  return (
    <Card>
      <Box padding={6} gap={6}>
        <SmallTitleText className="flex items-center gap-1">
          {t('fellowship.votingHistory.completedVotingVoted')}
          <span className={cnTw({ 'text-text-positive': alreadyVotedAye, 'text-text-negative': alreadyVotedNay })}>
            {alreadyVotedAye ? t('fellowship.votingHistory.level.good') : t('fellowship.votingHistory.level.notGood')}
          </span>
        </SmallTitleText>

        <Box gap={4}>
          <Box direction="row" gap={4}>
            <VotingButtonWithTooltip
              variant="negative"
              icon="negative"
              disabled={!alreadyVotedNay}
              isVoted={alreadyVotedNay}
              checked={alreadyVotedNay}
              fullWidth
            >
              {t('fellowship.voting.notGood')}
            </VotingButtonWithTooltip>

            <VotingButtonWithTooltip
              variant="positive"
              icon="positive"
              disabled={!alreadyVotedAye}
              isVoted={alreadyVotedAye}
              checked={alreadyVotedAye}
              fullWidth
            >
              {t('fellowship.voting.good')}
            </VotingButtonWithTooltip>
          </Box>
        </Box>
      </Box>
    </Card>
  );
});
