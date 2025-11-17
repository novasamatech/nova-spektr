import { useEffect, useState } from 'react';

import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { getCreatedDateFromApi, toRomanNumeral } from '@/shared/lib/utils';
import { FootnoteText, SmallTitleText } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { useFellowshipMemberCurrentTrack, useFellowshipMemberEndDemotionBlock } from '@/aggregates/fellowship-member';
import { useFellowshipApi } from '@/aggregates/fellowship-network';
import { RetentionEndTimer } from '../RetentionEndTimer';
import { BadgeIcon } from '../TaskBadge';

export const requestRetentionTaskActionSlot = createSlot();

export const RequestRetention = () => {
  const { t, formatDate } = useI18n();
  const [periodEnd, setPeriodEnd] = useState(0);

  const api = useFellowshipApi();
  const { data: track } = useFellowshipMemberCurrentTrack();
  const { data: endDemotionBlock } = useFellowshipMemberEndDemotionBlock();

  useEffect(() => {
    if (api && endDemotionBlock) {
      getCreatedDateFromApi(endDemotionBlock, api).then(setPeriodEnd);
    }
  }, [api, endDemotionBlock]);

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
        <RetentionEndTimer endBlock={endDemotionBlock} shortDateFormat />
        <Slot id={requestRetentionTaskActionSlot} />
      </Box>
    </Box>
  );
};
