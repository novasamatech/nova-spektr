import { useGate, useStoreMap, useUnit } from 'effector-react';
import { memo, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { type ReferendumId } from '@/shared/pallet/referenda';
import { ButtonCard, FootnoteText } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { collectiveDomain } from '@/domains/collectives';
import { votingFeatureStatus } from '../model/status';
import { votingStatusModel } from '../model/votingStatus';

import { VotingModal } from './VotingModal';

type Props = {
  referendumId: ReferendumId;
};

export const VotingButtons = memo(({ referendumId }: Props) => {
  useGate(votingFeatureStatus.gate);
  useGate(votingStatusModel.gate, { referendumId });

  const { t } = useI18n();

  const chain = useStoreMap(votingFeatureStatus.input, input => input?.chain ?? null);
  const referendum = useUnit(votingStatusModel.$referendum);
  const canVote = useUnit(votingStatusModel.$canVote);
  const hasRequiredRank = useUnit(votingStatusModel.$hasRequiredRank);
  const voting = useUnit(votingStatusModel.$referendumVoting);

  const [decision, setDecision] = useState<'aye' | 'nay' | null>(null);

  if (nullable(chain) || nullable(referendum) || collectiveDomain.referendumService.isCompleted(referendum)) {
    return null;
  }

  const buttonDiabled = !canVote || !hasRequiredRank;

  const renderAyeButton = nullable(voting) || !voting.aye;
  const renderNayButton = nullable(voting) || !voting.nay;

  return (
    <>
      <VotingModal isOpen={nonNullable(decision)} vote={decision} onClose={() => setDecision(null)} />
      <Box gap={4}>
        <Box direction="row" gap={4}>
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
        </Box>

        {canVote && !hasRequiredRank ? (
          <FootnoteText className="text-center">{t('fellowship.voting.errors.rankThreshold')}</FootnoteText>
        ) : null}
      </Box>
    </>
  );
});
