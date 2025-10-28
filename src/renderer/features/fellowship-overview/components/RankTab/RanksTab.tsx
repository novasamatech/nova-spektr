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
    <div className="flex h-full flex-col">
      <div className="mb-13 min-h-0 flex-1 overflow-hidden pt-9">
        <ScrollArea>
          <Box gap={6} padding={5}>
            <RankProgress onRankClick={handleRankClick} />
            <RankDetails selectedRankId={selectedRankId} />
          </Box>
        </ScrollArea>
      </div>
    </div>
  );
};
