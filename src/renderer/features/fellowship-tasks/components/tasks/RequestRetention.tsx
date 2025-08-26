import { useUnit } from 'effector-react';
import { useEffect, useState } from 'react';

import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { getCreatedDateFromApi, toRomanNumeral } from '@/shared/lib/utils';
import { FootnoteText, SmallTitleText } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { fellowshipTasksFeature } from '../../model/feature';
import { periods } from '../../model/periods';
import { tracks } from '../../model/tracks';
import { RetentionEndTimer } from '../RetentionEndTimer';
import { BadgeIcon } from '../TaskBadge';

export const requestRetentionATaskActionSlot = createSlot();

export const RequestRetention = () => {
  const { t, formatDate } = useI18n();
  const [periodEnd, setPeriodEnd] = useState(0);

  const input = useUnit(fellowshipTasksFeature.input);
  const track = useUnit(tracks.$currentTrack);
  const endDemotionPeriod = useUnit(periods.$endDemotionPeriod);

  useEffect(() => {
    if (input?.api && endDemotionPeriod) {
      getCreatedDateFromApi(endDemotionPeriod, input.api).then(setPeriodEnd);
    }
  }, [input?.api, endDemotionPeriod]);

  return (
    <Box direction="row" padding={4} gap={2} verticalAlign="flex-end">
      <Box alignSelf="flex-start" shrink={0}>
        <BadgeIcon iconName="submitRetentionEvidence" />
      </Box>
      <Box gap={3} grow={1} alignSelf="flex-start">
        <SmallTitleText>{t('fellowship.tasks.task.retention.title')}</SmallTitleText>
        <FootnoteText>
          {t('fellowship.tasks.task.retention.description', { rank: toRomanNumeral(track?.id ?? 0) })}
        </FootnoteText>
        <FootnoteText className="text-text-secondary">
          {t('fellowship.tasks.task.retention.until', {
            date: periodEnd !== 0 ? formatDate(periodEnd, 'dd.MM.yyyy') : null,
          })}
        </FootnoteText>
      </Box>
      <Box verticalAlign="center" gap={8} horizontalAlign="end" shrink={0} height="100%">
        <RetentionEndTimer endBlock={endDemotionPeriod} shortDateFormat />
        <Slot id={requestRetentionATaskActionSlot} />
      </Box>
    </Box>
  );
};
