import { useGate } from 'effector-react';
import { memo } from 'react';

import { type ReferendumId } from '@/shared/pallet/referenda';
import { ButtonCard } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { votingFeatureStatus } from '../model/status';

type Props = {
  referendumId: ReferendumId;
};

export const VotingButtons = memo((_props: Props) => {
  useGate(votingFeatureStatus.gate);

  return (
    <Box direction="row" gap={4}>
      {/* eslint-disable-next-line i18next/no-literal-string */}
      <ButtonCard pallet="positive" icon="thumbUp">
        Aye
      </ButtonCard>
      {/* eslint-disable-next-line i18next/no-literal-string */}
      <ButtonCard pallet="negative" icon="thumbDown">
        Nay
      </ButtonCard>
    </Box>
  );
});
