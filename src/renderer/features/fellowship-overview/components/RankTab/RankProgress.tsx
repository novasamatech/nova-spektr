import { useUnit } from 'effector-react';
import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { TitleText } from '@/shared/ui';
import { Box, ProgressWithDividers, Surface } from '@/shared/ui-kit';
import { promotion } from '../../model/promotion';
import { createRankSegmentsRankTab } from '../../utils/rankHelpers';

const rankSegments = createRankSegmentsRankTab();

interface RankProgressProps {
  onRankClick: (rankId: number) => void;
}

export const RankProgress = memo(({ onRankClick }: RankProgressProps) => {
  const { t } = useI18n();
  const currentRank = useUnit(promotion.$currentRank);

  const currentRankId = currentRank?.toString() ?? null;

  const handleSegmentClick = (segmentId: string) => {
    const rankId = parseInt(segmentId, 10);
    onRankClick(rankId);
  };

  if (!currentRankId) {
    return null;
  }

  return (
    <Box gap={3}>
      <Surface className="pb-3 pl-4">
        <TitleText className="pt-3 text-header-title">{t('fellowship.ranks.fromIDan')}</TitleText>
        <ProgressWithDividers
          segments={rankSegments}
          currentSegmentId={currentRankId}
          lastLabel="∞"
          bottomLabelPrefix="RANK"
          onSegmentClick={handleSegmentClick}
        />
      </Surface>
    </Box>
  );
});

RankProgress.displayName = 'RankProgress';
