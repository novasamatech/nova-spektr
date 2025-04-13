import { memo } from 'react';

import { DynamicVoteChart } from '@/shared/ui-entities';
import { Box, FilledIconButton } from '@/shared/ui-kit';
import { type Evidence } from '@/domains/collectives';

import { EvidenceVotingModal } from './EvidenceVotingModal';

type Props = {
  evidence: Evidence;
  variant: 'large' | 'small';
};

export const VotingActions = memo(({ evidence, variant }: Props) => {
  const buttonNodes = (
    <Box direction="row" gap={0.5}>
      <EvidenceVotingModal evidence={evidence} aye={false}>
        <FilledIconButton variant="negative" icon="thumbDown" />
      </EvidenceVotingModal>

      <EvidenceVotingModal evidence={evidence} aye={true}>
        <FilledIconButton variant="positive" icon="thumbUp" />
      </EvidenceVotingModal>
    </Box>
  );

  const chartNode = <DynamicVoteChart value={50} hasVotes />;

  if (variant === 'large') {
    return (
      <Box direction="row" verticalAlign="center" gap={8}>
        <Box width="280px">{chartNode}</Box>
        {buttonNodes}
      </Box>
    );
  }

  if (variant === 'small') {
    return (
      <Box verticalAlign="center" gap={1} width="102px">
        {buttonNodes}
        {chartNode}
      </Box>
    );
  }

  return null;
});
