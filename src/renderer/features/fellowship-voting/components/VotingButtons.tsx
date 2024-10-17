import { useGate, useStoreMap, useUnit } from 'effector-react';
import { memo, useState } from 'react';

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
  const [decision, setDecision] = useState<'aye' | 'nay' | null>(null);

  useGate(votingFeatureStatus.gate);
  useGate(votingStatusModel.gate, { referendumId });

  const chain = useStoreMap(votingFeatureStatus.input, input => input?.chain ?? null);

  const referendum = useUnit(votingStatusModel.$referendum);
  const canVote = useUnit(votingStatusModel.$canVote);
  const hasRequiredRank = useUnit(votingStatusModel.$hasRequiredRank);

  if (nullable(chain) || nullable(referendum) || collectiveDomain.referendumService.isCompleted(referendum)) {
    return null;
  }

  // TODO restore
  // const buttonDiabled = !canVote || !hasRequiredRank;
  const buttonDiabled = false;

  return (
    <Box gap={4}>
      <Box direction="row" gap={4}>
        <VotingModal isOpen={nonNullable(decision)} vote={decision} onClose={() => setDecision(null)} />

        {/* eslint-disable-next-line i18next/no-literal-string */}
        <ButtonCard
          pallet="positive"
          icon="thumbUp"
          disabled={buttonDiabled}
          fullWidth
          onClick={() => setDecision('aye')}
        >
          Aye
        </ButtonCard>

        {/* eslint-disable-next-line i18next/no-literal-string */}
        <ButtonCard
          pallet="negative"
          icon="thumbDown"
          disabled={buttonDiabled}
          fullWidth
          onClick={() => setDecision('nay')}
        >
          Nay
        </ButtonCard>
      </Box>

      {canVote && !hasRequiredRank ? (
        // eslint-disable-next-line i18next/no-literal-string
        <FootnoteText className="text-center">
          You cannot vote in this referendum because your rank is below the required level.
        </FootnoteText>
      ) : null}
    </Box>
  );
});
