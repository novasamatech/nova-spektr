import { useUnit } from 'effector-react';
import { memo } from 'react';

import { Box } from '@/shared/ui-kit';
import { promotion } from '../../model/promotion';

import { RankCard } from './RankCard';
import { RequirementsCard } from './RequirementsCard';

interface RankDetailsProps {
  selectedRankId: number;
}

export const RankDetails = memo(({ selectedRankId }: RankDetailsProps) => {
  const currentRank = useUnit(promotion.$currentRank);
  const isCurrentRank = currentRank === selectedRankId;

  return (
    <Box direction="row" gap={4} horizontalAlign="flex-start">
      <RankCard rankId={selectedRankId} isCurrentRank={isCurrentRank} />
      <RequirementsCard rankId={selectedRankId} />
    </Box>
  );
});

RankDetails.displayName = 'RankDetails';
