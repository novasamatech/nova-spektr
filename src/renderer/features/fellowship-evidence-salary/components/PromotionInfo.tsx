import { useUnit } from 'effector-react';
import { memo, useEffect, useState } from 'react';
import { Trans } from 'react-i18next';

import { useI18n } from '@/shared/i18n';
import { getRelativeTimeFromApi } from '@/shared/lib/utils';
import { Button, CaptionText, Duration, FootnoteText, InfoLink, LabelHelpBox, SmallTitleText } from '@/shared/ui';
import { CollectiveRank, toRomanNumeral } from '@/shared/ui-entities';
import { Box, Popover } from '@/shared/ui-kit';
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
      <DescriptionInfo />
    </Box>
  );
});

const DescriptionInfo = memo(() => {
  const { t } = useI18n();
  const nextTrack = useUnit(evidenceInfo.$nextTrack);
  if (!nextTrack) return null;

  return (
    <Popover dialog align="start">
      <Popover.Trigger>
        <div>
          <LabelHelpBox>
            {t('fellowship.salary.promotionRankHelpLabel', {
              rank: toRomanNumeral(nextTrack.id),
              name: nextTrack.name.replace(/s$/, ''),
            })}
          </LabelHelpBox>
        </div>
      </Popover.Trigger>
      <Popover.Content>
        <Box padding={4} gap={2} width={90}>
          <FootnoteText as="ul" className="list-disc pl-3 text-text-secondary">
            <Trans t={t} i18nKey={`fellowship.salary.promotionHelpRank${nextTrack.id}`} components={{ li: <li /> }} />
          </FootnoteText>
          <InfoLink url="https://github.com/polkadot-fellows/manifesto/blob/main/manifesto.pdf">
            {t('fellowship.salary.promotionReadManifesto')}
          </InfoLink>
        </Box>
      </Popover.Content>
    </Popover>
  );
});
