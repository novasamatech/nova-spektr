import { useUnit } from 'effector-react';
import { useEffect, useState } from 'react';

import { Box, ScrollArea } from '@/shared/ui-kit';
import { promotion } from '../../model/promotion';

import { RankDetails, RankProgress } from './index';

export const RanksTab = () => {
  const currentRank = useUnit(promotion.$currentRank);
  const [selectedRankId, setSelectedRankId] = useState<number>(1);

  useEffect(() => {
    if (currentRank !== null) {
      setSelectedRankId(currentRank);
    }
  }, [currentRank]);

  const handleRankClick = (rankId: number) => {
    setSelectedRankId(rankId);
  };

  return (
    <ScrollArea>
      <Box padding={5} margin={[0, 0, 12]} gap={6}>
        <RankProgress onRankClick={handleRankClick} />
        <RankDetails selectedRankId={selectedRankId} />
      </Box>
    </ScrollArea>
  );
};
