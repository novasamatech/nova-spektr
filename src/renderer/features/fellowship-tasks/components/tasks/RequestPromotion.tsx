import { useUnit } from 'effector-react';

import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { toRomanNumeral } from '@/shared/lib/utils';
import { FootnoteText, Icon, Separator, SmallTitleText } from '@/shared/ui';
import { CollectiveRank, TrackDescription } from '@/shared/ui-entities';
import { Box } from '@/shared/ui-kit';
import { tracks } from '../../model/tracks';

export const requestPromotionActionSlot = createSlot();

export const RequestPromotion = () => {
  const { t } = useI18n();

  const currentTrack = useUnit(tracks.$currentTrack);
  const nextTrack = useUnit(tracks.$nextTrack);

  return (
    <Box direction="row" padding={4} gap={5}>
      <Box grow={1} gap={3}>
        <SmallTitleText>{t('fellowship.tasks.task.promotion.title')}</SmallTitleText>
        <Box direction="row" gap={2.5}>
          {currentTrack ? <CollectiveRank rank={currentTrack.id}>{currentTrack.name}</CollectiveRank> : null}
          <Icon name="right" size={16} className="text-text-primary" />
          {nextTrack ? <CollectiveRank rank={nextTrack.id}>{nextTrack.name}</CollectiveRank> : null}
        </Box>
        <FootnoteText>
          {t('fellowship.tasks.task.promotion.description', { rank: toRomanNumeral(nextTrack?.id ?? 0) })}
        </FootnoteText>
        {nextTrack ? <TrackDescription track={nextTrack} /> : null}
      </Box>
      <Separator vertical />
      <Box verticalAlign="center" shrink={0}>
        <Slot id={requestPromotionActionSlot} />
      </Box>
    </Box>
  );
};
