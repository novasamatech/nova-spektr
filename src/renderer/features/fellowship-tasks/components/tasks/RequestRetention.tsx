import { useUnit } from 'effector-react';

import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { toRomanNumeral } from '@/shared/lib/utils';
import { FootnoteText, SmallTitleText } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { periods } from '../../model/periods';
import { tracks } from '../../model/tracks';
import { ReferendumEndTimer } from '../ReferendumEndTimer';

export const requestRetentionActionSlot = createSlot();

export const RequestRetention = () => {
  const { t } = useI18n();

  const track = useUnit(tracks.$currentTrack);
  const endDemotionPeriod = useUnit(periods.$endDemotionPeriod);

  return (
    <Box direction="row" padding={4} gap={5} verticalAlign="flex-end">
      <Box gap={3} grow={1}>
        <SmallTitleText>{t('fellowship.tasks.task.retention.title')}</SmallTitleText>
        <FootnoteText>
          {t('fellowship.tasks.task.retention.description', { rank: toRomanNumeral(track?.id ?? 0) })}
        </FootnoteText>
      </Box>
      <Box verticalAlign="center" gap={1} horizontalAlign="end" shrink={0} height="100%">
        <ReferendumEndTimer endBlock={endDemotionPeriod} referendumType="personal" shortDateFormat />
        <Slot id={requestRetentionActionSlot} />
      </Box>
    </Box>
  );
};
