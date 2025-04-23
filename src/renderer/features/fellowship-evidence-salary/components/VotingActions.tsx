import { memo } from 'react';

import { nonNullable } from '@/shared/lib/utils';
import { Box, FilledIconButton } from '@/shared/ui-kit';
import { type Evidence } from '@/domains/collectives';

import { EvidenceVotingModal } from './EvidenceVotingModal';
import { PeriodEndTimer } from './PeriodEndTimer';

type Props = {
  evidence: Evidence;
  endBlock: number | null;
  variant: 'large' | 'small';
};

export const VotingActions = memo(({ evidence, endBlock, variant }: Props) => {
  const buttonNodes = (
    <Box direction="row" gap={1}>
      <EvidenceVotingModal evidence={evidence} aye={false}>
        <FilledIconButton variant="negative" icon="thumbDown" />
      </EvidenceVotingModal>

      <EvidenceVotingModal evidence={evidence} aye={true}>
        <FilledIconButton variant="positive" icon="thumbUp" />
      </EvidenceVotingModal>
    </Box>
  );

  if (variant === 'large') {
    return buttonNodes;
  }

  if (variant === 'small') {
    return (
      <Box
        verticalAlign={nonNullable(endBlock) ? 'space-between' : 'flex-end'}
        horizontalAlign="flex-end"
        gap={2}
        height="92px"
        width="102px"
      >
        {nonNullable(endBlock) && <PeriodEndTimer endBlock={endBlock} shortDateFormat />}
        {buttonNodes}
      </Box>
    );
  }

  return null;
});
