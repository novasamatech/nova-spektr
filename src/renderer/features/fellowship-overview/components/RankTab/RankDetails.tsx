import { memo } from 'react';

import { Box } from '@/shared/ui-kit';
import { useFellowshipMember } from '@/aggregates/fellowship-member';

import { RankCard } from './RankCard';
import { RequirementsCard } from './RequirementsCard';

interface RankDetailsProps {
  selectedRankId: number;
}

export const RankDetails = memo(({ selectedRankId }: RankDetailsProps) => {
  const { data: member } = useFellowshipMember();
  const isCurrentRank = member?.rank === selectedRankId;

  return (
    <Box direction="row" gap={4} horizontalAlign="flex-start">
      <RankCard rankId={selectedRankId} isCurrentRank={isCurrentRank} />
      <RequirementsCard rankId={selectedRankId} />
    </Box>
  );
});

RankDetails.displayName = 'RankDetails';
