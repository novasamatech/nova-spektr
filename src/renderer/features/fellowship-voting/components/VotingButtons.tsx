import { useGate, useStoreMap, useUnit } from 'effector-react';
import { memo } from 'react';

import { nullable } from '@/shared/lib/utils';
import { type ReferendumId } from '@/shared/pallet/referenda';
import { ButtonCard, FootnoteText } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { collectiveDomain } from '@/domains/collectives';
import { votingFeatureStatus } from '../model/status';
import { votingModel } from '../model/voting';

import { VotingModal } from './VotingModal';

type Props = {
  referendumId: ReferendumId;
};

export const VotingButtons = memo(({ referendumId }: Props) => {
  useGate(votingFeatureStatus.gate);
  useGate(votingModel.gate, { referendumId });

  const chain = useStoreMap(votingFeatureStatus.input, input => input?.chain ?? null);

  const referendum = useUnit(votingModel.$referendum);
  const canVote = useUnit(votingModel.$canVote);
  const hasRequiredRank = useUnit(votingModel.$hasRequiredRank);

  if (nullable(chain) || nullable(referendum) || collectiveDomain.referendumService.isCompleted(referendum)) {
    return null;
  }

  // const buttonDiabled = !canVote || !hasRequiredRank;
  const buttonDiabled = false;

  return (
    <Box gap={4}>
      <Box direction="row" gap={4}>
        <VotingModal vote="aye">
          {/* eslint-disable-next-line i18next/no-literal-string */}
          <ButtonCard pallet="positive" icon="thumbUp" disabled={buttonDiabled} fullWidth>
            Aye
          </ButtonCard>
        </VotingModal>
        <VotingModal vote="nay">
          {/* eslint-disable-next-line i18next/no-literal-string */}
          <ButtonCard pallet="negative" icon="thumbDown" disabled={buttonDiabled} fullWidth>
            Nay
          </ButtonCard>
        </VotingModal>
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
