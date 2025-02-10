import { useUnit } from 'effector-react';
import { memo, useEffect, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { getRelativeTimeFromApi } from '@/shared/lib/utils';
import { Alert, Button, Duration, FootnoteText, SmallTitleText } from '@/shared/ui';
import { CollectiveRank } from '@/shared/ui-entities';
import { Box } from '@/shared/ui-kit';
import { memberService } from '@/domains/collectives';
import { evidenceInfo } from '../model/evidence';
import { fellowshipSalaryFeature } from '../model/feature';
import { profile } from '../model/profile';

import { RetentionEvidenceFormModal } from './RetentionEvidenceFormModal';

export const RetentionEvidenceInfo = memo(() => {
  const { t } = useI18n();
  const [timeLeft, setTimeLeft] = useState(0);

  const input = useUnit(fellowshipSalaryFeature.input);
  const currentMember = useUnit(profile.$member);
  const track = useUnit(evidenceInfo.$track);
  const currentBlock = useUnit(evidenceInfo.$currentBlock);
  const demotionPeriod = useUnit(evidenceInfo.$demotionPeriod);
  const hasRetentionEvidence = useUnit(evidenceInfo.$hasRetentionEvidence);
  const hasPromotionEvidence = useUnit(evidenceInfo.$hasPromotionEvidence);

  useEffect(() => {
    if (input?.api && demotionPeriod) {
      const gone =
        currentBlock - (currentMember && memberService.isCoreMember(currentMember) ? currentMember.lastProof : 0);
      const left = demotionPeriod - gone;
      if (left > 0) {
        getRelativeTimeFromApi(demotionPeriod - gone, input.api).then(setTimeLeft);
      } else {
        setTimeLeft(0);
      }
    }
  }, [input?.api, demotionPeriod, currentBlock, currentMember]);

  return (
    <Box padding={[4, 5, 5]} gap={6}>
      <CollectiveRank rank={currentMember?.rank ?? 0}>{track?.name.replace(/s$/, '')}</CollectiveRank>

      {!hasRetentionEvidence && timeLeft !== 0 && (
        <Box direction="row">
          <Box gap={1} grow={1}>
            <FootnoteText className="text-text-secondary">{t('fellowship.salary.retentionLeft')}</FootnoteText>
            <SmallTitleText>
              <Duration seconds={timeLeft / 1000} />
            </SmallTitleText>
          </Box>
          <RetentionEvidenceFormModal>
            <Button>{t('fellowship.salary.retentionSubmit')}</Button>
          </RetentionEvidenceFormModal>
        </Box>
      )}

      {hasRetentionEvidence && (
        <Box direction="row">
          <Box gap={1} grow={1}>
            <FootnoteText className="text-text-secondary">{t('fellowship.salary.retentionApplied')}</FootnoteText>
            <SmallTitleText>{t('fellowship.salary.retentionAppliedDescription')}</SmallTitleText>
          </Box>
          {/*TODO implement evidence manipulation*/}
        </Box>
      )}

      {hasPromotionEvidence && (
        <Alert active variant="warn" title={t('fellowship.salary.promotionAppliedAlertTitle')}>
          <Alert.Item withDot={false}>{t('fellowship.salary.promotionAppliedAlertDescription')}</Alert.Item>
        </Alert>
      )}
    </Box>
  );
});
