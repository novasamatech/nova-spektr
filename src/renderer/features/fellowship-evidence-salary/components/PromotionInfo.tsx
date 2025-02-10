import { useUnit } from 'effector-react';
import { memo, useEffect, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { getRelativeTimeFromApi } from '@/shared/lib/utils';
import { Button, CaptionText, Duration, FootnoteText, SmallTitleText } from '@/shared/ui';
import { CollectiveRank } from '@/shared/ui-entities';
import { Box } from '@/shared/ui-kit';
import { evidenceInfo } from '../model/evidence';
import { fellowshipSalaryFeature } from '../model/feature';

export const PromotionInfo = memo(() => {
  const { t } = useI18n();
  const [timeLeft, setTimeLeft] = useState(0);

  const input = useUnit(fellowshipSalaryFeature.input);
  const nextTrack = useUnit(evidenceInfo.$nextTrack);
  const hasPromotionEvidence = useUnit(evidenceInfo.$hasPromotionEvidence);
  const leftToPromotionPeriod = useUnit(evidenceInfo.$leftToPromotionPeriod);

  useEffect(() => {
    if (input?.api && leftToPromotionPeriod) {
      if (leftToPromotionPeriod > 0) {
        getRelativeTimeFromApi(leftToPromotionPeriod, input.api).then(setTimeLeft);
      } else {
        setTimeLeft(0);
      }
    }
  }, [input?.api, leftToPromotionPeriod]);

  return (
    <Box gap={6}>
      <Box direction="row" verticalAlign="center" horizontalAlign="space-between">
        <CaptionText className="uppercase text-text-secondary">{t('fellowship.salary.promotionNextRank')}</CaptionText>
        <CollectiveRank rank={nextTrack?.id ?? 0}>{nextTrack?.name.replace(/s$/, '')}</CollectiveRank>
      </Box>
      {!hasPromotionEvidence && (
        <Box direction="row">
          <Box gap={1} grow={1}>
            <FootnoteText className="text-text-secondary">{t('fellowship.salary.promotionUntilNext')}</FootnoteText>
            {!hasPromotionEvidence && timeLeft === 0 && (
              <SmallTitleText>{t('fellowship.salary.promotionReadyToApply')}</SmallTitleText>
            )}
            {timeLeft > 0 && (
              <SmallTitleText>
                <Duration seconds={timeLeft / 1000} />
              </SmallTitleText>
            )}
          </Box>
          {!hasPromotionEvidence && timeLeft === 0 && <Button>{t('general.button.applyButton')}</Button>}
        </Box>
      )}
    </Box>
  );
});
