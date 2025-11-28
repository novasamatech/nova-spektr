import { useUnit } from 'effector-react';
import { memo, useEffect, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { getRelativeTimeFromApi, nonNullable, nullable } from '@/shared/lib/utils';
import { Button, CaptionText, Duration, FootnoteText, IconButton, SmallTitleText } from '@/shared/ui';
import { CollectiveRank, TrackDescription } from '@/shared/ui-entities';
import { Box } from '@/shared/ui-kit';
import { evidenceService, memberService, salaryService } from '@/domains/collectives';
import { accountService } from '@/domains/network';
import { evidenceInfo } from '../model/evidence';
import { fellowshipEvidenceFeature } from '../model/feature';
import { memberSalary } from '../model/memberSalary';
import { profile } from '../model/profile';

import { EvidencePostFlowTrigger } from './EvidencePostFlowTrigger';

export const PromotionInfo = memo(() => {
  const { t } = useI18n();
  const [timeLeft, setTimeLeft] = useState(0);

  const input = useUnit(fellowshipEvidenceFeature.input);
  const nextTrack = useUnit(evidenceInfo.$nextTrack);
  const evidence = useUnit(evidenceInfo.$memberEvidence);
  const hasPromotionEvidence = useUnit(evidenceInfo.$hasPromotionEvidence);
  const leftToPromotion = useUnit(evidenceInfo.$leftToPromotion);
  const claimStatus = useUnit(memberSalary.$memberClaimStatus);
  const currentMember = useUnit(profile.$member);
  const account = useUnit(profile.$account);

  const isCoreMember = nonNullable(currentMember) && memberService.isCoreMember(currentMember);
  const isInducted = nonNullable(claimStatus) && salaryService.isInducted(claimStatus);
  const disabled =
    nullable(account) || !accountService.hasPermissionToMakeActions(account) || !isCoreMember || !isInducted;

  useEffect(() => {
    if (input?.api && leftToPromotion) {
      if (leftToPromotion > 0) {
        getRelativeTimeFromApi(leftToPromotion, input.api).then(setTimeLeft);
      } else {
        setTimeLeft(0);
      }
    }
  }, [input?.api, leftToPromotion]);

  if (currentMember && !memberService.canPromote(currentMember)) {
    return null;
  }

  const openEvidence = () => {
    if (evidence) {
      window.open(evidenceService.getEvidenceIpfsUrl(evidence.hash), '_blank');
    }
  };

  return (
    <Box gap={6}>
      <Box direction="row" verticalAlign="center" horizontalAlign="space-between">
        <CaptionText className="text-text-secondary uppercase">{t('fellowship.salary.promotionNextRank')}</CaptionText>
        <CollectiveRank showName rank={nextTrack?.id ?? 0} />
      </Box>
      {!hasPromotionEvidence && (
        <Box direction="row">
          <Box gap={1} grow={1}>
            <FootnoteText className="text-text-secondary">{t('fellowship.salary.promotionUntilNext')}</FootnoteText>
            {timeLeft === 0 && <SmallTitleText>{t('fellowship.salary.promotionReadyToApply')}</SmallTitleText>}
            {timeLeft > 0 && (
              <SmallTitleText>
                <Duration seconds={timeLeft / 1000} />
              </SmallTitleText>
            )}
          </Box>
          {timeLeft === 0 && (
            <EvidencePostFlowTrigger wish="Promotion">
              <Button disabled={disabled}>{t('general.button.applyButton')}</Button>
            </EvidencePostFlowTrigger>
          )}
        </Box>
      )}
      {hasPromotionEvidence && (
        <Box direction="row" verticalAlign="center">
          <Box gap={1} grow={1}>
            <FootnoteText className="text-text-secondary">{t('fellowship.salary.promotionApplied')}</FootnoteText>
            <SmallTitleText>{t('fellowship.salary.retentionAppliedDescription')}</SmallTitleText>
          </Box>
          <Box direction="row" gap={4}>
            <IconButton name="eye" size={16} onClick={openEvidence} />
            <EvidencePostFlowTrigger wish="Promotion">
              <IconButton name="editKeys" size={16} />
            </EvidencePostFlowTrigger>
          </Box>
        </Box>
      )}
      {nonNullable(nextTrack) && <TrackDescription track={nextTrack} />}
    </Box>
  );
});
