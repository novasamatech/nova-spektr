import { useStoreMap, useUnit } from 'effector-react';
import { memo, useState } from 'react';

import { useFlow } from '@/shared/effector';
import { useI18n } from '@/shared/i18n';
import { cnTw, nonNullable, nullable } from '@/shared/lib/utils';
import { SmallTitleText } from '@/shared/ui';
import { VotingButtonWithTooltip } from '@/shared/ui-entities';
import { Box } from '@/shared/ui-kit';
import { type Evidence, type Referendum } from '@/domains/collectives';
import { Card } from '@/features/fellowship-referendum-details';
import { fellowshipVotingFeature } from '../model/feature';
import { votingStatus } from '../model/votingStatus';

import { VotingModal } from './VotingModal';

type Props = {
  referendum?: Referendum | null;
  evidence?: Evidence | null;
};

export const VotingButtonsCompleted = memo(({ referendum }: Props) => {
  useFlow(votingStatus.flow, { referendumId: referendum?.id ?? null });

  const { t } = useI18n();

  const chain = useStoreMap(fellowshipVotingFeature.input, input => input?.chain ?? null);

  const voting = useUnit(votingStatus.$referendumVoting);
  const currentMember = useUnit(votingStatus.$currentMember);

  const [decision, setDecision] = useState<'aye' | 'nay' | null>(null);

  if (nullable(chain) || nullable(referendum) || nullable(currentMember)) {
    return null;
  }

  const alreadyVotedNay = nonNullable(voting) && voting.decision === 'Nay';
  const alreadyVotedAye = nonNullable(voting) && voting.decision === 'Aye';

  return (
    <Card>
      <Box padding={6} gap={6}>
        <SmallTitleText className="flex items-center gap-1">
          {t('fellowship.votingHistory.completedVotingVoted')}
          <span className={cnTw({ 'text-text-positive': alreadyVotedAye, 'text-text-negative': alreadyVotedNay })}>
            {alreadyVotedAye ? t('fellowship.votingHistory.level.good') : t('fellowship.votingHistory.level.notGood')}
          </span>
        </SmallTitleText>

        <VotingModal isOpen={nonNullable(decision)} vote={decision} onClose={() => setDecision(null)} />
        <Box gap={4}>
          <Box direction="row" gap={4}>
            <VotingButtonWithTooltip
              variant="negative"
              icon="negative"
              disabled={!alreadyVotedNay}
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
              disabled={!alreadyVotedAye}
              isVoted={alreadyVotedAye}
              checked={alreadyVotedAye}
              fullWidth
              onClick={() => !alreadyVotedAye && setDecision('aye')}
            >
              {t('fellowship.voting.good')}
            </VotingButtonWithTooltip>
          </Box>
        </Box>
      </Box>
    </Card>
  );
});
