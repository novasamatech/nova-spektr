import { useStoreMap, useUnit } from 'effector-react';
import { memo, useState } from 'react';

import { useFlow } from '@/shared/effector';
import { useI18n } from '@/shared/i18n';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { type ReferendumId } from '@/shared/pallet/referenda';
import { ButtonCard, FootnoteText } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { referendumService } from '@/domains/collectives';
import { fellowshipVotingFeature } from '../model/feature';
import { votingStatus } from '../model/votingStatus';

import { VotingModal } from './VotingModal';

type Props = {
  referendumId: ReferendumId;
};

export const VotingButtons = memo(({ referendumId }: Props) => {
  useFlow(votingStatus.flow, { referendumId });

  const { t } = useI18n();

  const chain = useStoreMap(fellowshipVotingFeature.input, input => input?.chain ?? null);
  const referendum = useUnit(votingStatus.$referendum);
  const canVote = useUnit(votingStatus.$canVote);
  const hasRequiredRank = useUnit(votingStatus.$hasRequiredRank);
  const voting = useUnit(votingStatus.$referendumVoting);

  const [decision, setDecision] = useState<'aye' | 'nay' | null>(null);

  if (nullable(chain) || nullable(referendum) || referendumService.isCompleted(referendum)) {
    return null;
  }

  const buttonDiabled = !canVote || !hasRequiredRank;

  const renderAyeButton = nullable(voting) || voting.decision !== 'Aye';
  const renderNayButton = nullable(voting) || voting.decision !== 'Nay';

  return (
    <>
      <VotingModal isOpen={nonNullable(decision)} vote={decision} onClose={() => setDecision(null)} />

      <Box gap={4}>
        <Box direction="row" gap={4}>
          {renderNayButton ? (
            <ButtonCard
              pallet="negative"
              icon="thumbDown"
              disabled={buttonDiabled}
              fullWidth
              onClick={() => setDecision('nay')}
            >
              {t('fellowship.voting.nay')}
            </ButtonCard>
          ) : null}

          {renderAyeButton ? (
            <ButtonCard
              pallet="positive"
              icon="thumbUp"
              disabled={buttonDiabled}
              fullWidth
              onClick={() => setDecision('aye')}
            >
              {t('fellowship.voting.aye')}
            </ButtonCard>
          ) : null}
        </Box>

        {canVote && !hasRequiredRank ? (
          <FootnoteText className="text-center">{t('fellowship.voting.errors.rankThreshold')}</FootnoteText>
        ) : null}
      </Box>
    </>
  );
});
