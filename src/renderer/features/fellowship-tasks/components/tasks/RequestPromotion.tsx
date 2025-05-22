import { useUnit } from 'effector-react';

import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { toRomanNumeral } from '@/shared/lib/utils';
import { FootnoteText, Icon, SmallTitleText } from '@/shared/ui';
import { CollectiveRank } from '@/shared/ui-entities';
import { Box } from '@/shared/ui-kit';
import { tracks } from '../../model/tracks';
import { BadgeIcon } from '../TaskBadge';

export const requestPromotionTaskActionSlot = createSlot();

export const RequestPromotion = () => {
  const { t } = useI18n();

  const currentTrack = useUnit(tracks.$currentTrack);
  const nextTrack = useUnit(tracks.$nextTrack);

  return (
    <Box direction="row" padding={4} gap={2} verticalAlign="flex-end">
      <Box alignSelf="flex-start" shrink={0}>
        <BadgeIcon iconName="submitPromotionEvidence" />
      </Box>
      <Box grow={1} gap={3} alignSelf="flex-start">
        <SmallTitleText>{t('fellowship.tasks.task.promotion.title')}</SmallTitleText>
        <Box direction="row" gap={2.5}>
          {currentTrack ? <CollectiveRank rank={currentTrack.id} showName /> : null}
          <Icon name="right" size={16} className="text-text-primary" />
          {nextTrack ? <CollectiveRank rank={nextTrack.id} showName /> : null}
        </Box>
        <FootnoteText>
          {t('fellowship.tasks.task.promotion.description', { rank: toRomanNumeral(nextTrack?.id ?? 0) })}
        </FootnoteText>
      </Box>
      <Box verticalAlign="center" shrink={0} width="102px">
        <Slot id={requestPromotionTaskActionSlot} />
      </Box>
    </Box>
  );
};
