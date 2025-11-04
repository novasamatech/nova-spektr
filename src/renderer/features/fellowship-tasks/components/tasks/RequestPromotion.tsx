import { useEffect, useState } from 'react';

import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { getCreatedDateFromApi, toRomanNumeral } from '@/shared/lib/utils';
import { FootnoteText, SmallTitleText } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { useFellowshipMemberEndPromotionBlock, useFellowshipMemberNextTrack } from '@/aggregates/fellowship-member';
import { useFellowshipApi } from '@/aggregates/fellowship-network';
import { PromotionEndTimer } from '../PromotionEndTimer';
import { BadgeIcon } from '../TaskBadge';

export const requestPromotionTaskActionSlot = createSlot();

export const RequestPromotion = () => {
  const { t, formatDate } = useI18n();
  const [periodEnd, setPeriodEnd] = useState(0);

  const api = useFellowshipApi();
  const { data: nextTrack } = useFellowshipMemberNextTrack();
  const { data: endPromotionPeriod } = useFellowshipMemberEndPromotionBlock();

  useEffect(() => {
    if (api && endPromotionPeriod) {
      getCreatedDateFromApi(endPromotionPeriod, api).then(setPeriodEnd);
    }
  }, [api, endPromotionPeriod]);

  return (
    <Box direction="row" padding={4} gap={2} verticalAlign="flex-end">
      <Box alignSelf="flex-start" shrink={0}>
        <BadgeIcon iconName="submitPromotionEvidence" />
      </Box>
      <Box grow={1} gap={3} alignSelf="flex-start">
        <SmallTitleText>{t('fellowship.tasks.task.promotion.title')}</SmallTitleText>
        <FootnoteText>
          {t('fellowship.tasks.task.promotion.description', { rank: toRomanNumeral(nextTrack?.id ?? 0) })}
        </FootnoteText>
        <FootnoteText className="text-text-secondary">
          {t('fellowship.tasks.task.promotion.until', {
            date: periodEnd !== 0 ? formatDate(periodEnd, 'dd.MM.yyyy') : null,
          })}
        </FootnoteText>
      </Box>
      <Box alignSelf="flex-start" gap={8} horizontalAlign="end" shrink={0} height="100%">
        <PromotionEndTimer endBlock={endPromotionPeriod} shortDateFormat />
        <Slot id={requestPromotionTaskActionSlot} />
      </Box>
    </Box>
  );
};
