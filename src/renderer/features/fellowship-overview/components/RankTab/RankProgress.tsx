import { useUnit } from 'effector-react';
import { memo, useMemo } from 'react';

import { useI18n } from '@/shared/i18n';
import { TitleText } from '@/shared/ui';
import { Box, ProgressWithDividers, Surface } from '@/shared/ui-kit';
import { promotion } from '../../model/promotion';
import { createRankSegments } from '../../utils/rankHelpers';

interface RankProgressProps {
  onRankClick: (rankId: number) => void;
}

export const RankProgress = memo(({ onRankClick }: RankProgressProps) => {
  const { t } = useI18n();
  const currentRank = useUnit(promotion.$currentRank);

  const currentRankId = useMemo(() => {
    return currentRank?.toString() ?? null;
  }, [currentRank]);

  const rankSegments = useMemo(() => createRankSegments(), []);

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
        <TitleText className="pt-3 text-header-title text-text-primary">{t('fellowship.ranks.fromIDan')}</TitleText>
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
