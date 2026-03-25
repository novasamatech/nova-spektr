import { useUnit } from 'effector-react';
import { memo, useEffect, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { getRelativeTimeFromApi, nonNullable, nullable } from '@/shared/lib/utils';
import { Alert, Button, Duration, FootnoteText, IconButton, SmallTitleText } from '@/shared/ui';
import { CollectiveRank } from '@/shared/ui-entities';
import { Box } from '@/shared/ui-kit';
import { $primaryIpfsGateway, evidenceService, memberService } from '@/domains/collectives';
import { accountService } from '@/domains/network';
import { evidenceInfo } from '../model/evidence';
import { fellowshipEvidenceFeature } from '../model/feature';
import { profile } from '../model/profile';

import { EvidencePostFlowTrigger } from './EvidencePostFlowTrigger';

export const RetentionInfo = memo(() => {
  const { t } = useI18n();
  const [timeLeft, setTimeLeft] = useState(0);

  const input = useUnit(fellowshipEvidenceFeature.input);
  const primaryGateway = useUnit($primaryIpfsGateway);
  const currentMember = useUnit(profile.$member);
  const account = useUnit(profile.$account);

  const leftToDemotion = useUnit(evidenceInfo.$leftToDemotion);
  const showAttention = useUnit(evidenceInfo.$showAttention);
  const hasRetentionEvidence = useUnit(evidenceInfo.$hasRetentionEvidence);
  const hasPromotionEvidence = useUnit(evidenceInfo.$hasPromotionEvidence);
  const memberEvidence = useUnit(evidenceInfo.$memberEvidence);

  const isCoreMember = nonNullable(currentMember) && memberService.isCoreMember(currentMember);
  const disabled = nullable(account) || !accountService.hasPermissionToMakeActions(account) || !isCoreMember;

  useEffect(() => {
    if (input?.api && leftToDemotion) {
      if (leftToDemotion > 0) {
        getRelativeTimeFromApi(leftToDemotion, input.api).then(setTimeLeft);
      } else {
        setTimeLeft(0);
      }
    }
  }, [input?.api, leftToDemotion]);

  return (
    <Box padding={[4, 5, 5]} gap={6}>
      <CollectiveRank rank={currentMember?.rank ?? 0} showName />

      {!hasRetentionEvidence && (
        <Box direction="row">
          <Box gap={1} grow={1}>
            <FootnoteText className="text-text-secondary">{t('fellowship.salary.retentionLeft')}</FootnoteText>
            <SmallTitleText>
              {timeLeft === 0 ? t('general.timeout.expired') : <Duration seconds={timeLeft / 1000} />}
            </SmallTitleText>
          </Box>
          <EvidencePostFlowTrigger wish="Retention">
            <Button disabled={disabled}>{t('fellowship.salary.retentionSubmit')}</Button>
          </EvidencePostFlowTrigger>
        </Box>
      )}

      {hasRetentionEvidence && (
        <Box direction="row" verticalAlign="center">
          <Box gap={1} grow={1}>
            <FootnoteText className="text-text-secondary">{t('fellowship.salary.retentionApplied')}</FootnoteText>
            <SmallTitleText>{t('fellowship.salary.retentionAppliedDescription')}</SmallTitleText>
          </Box>
          <Box direction="row" gap={4}>
            <IconButton
              name="eye"
              size={16}
              onClick={() => {
                if (memberEvidence) {
                  window.open(evidenceService.getEvidenceFetchIpfsUrl(memberEvidence.hash, primaryGateway), '_blank');
                }
              }}
            />
            <EvidencePostFlowTrigger wish="Retention">
              <IconButton name="editKeys" size={16} />
            </EvidencePostFlowTrigger>
          </Box>
        </Box>
      )}

      <Alert active={hasPromotionEvidence} variant="warn" title={t('fellowship.salary.promotionAppliedAlertTitle')}>
        <Alert.Item withDot={false}>{t('fellowship.salary.promotionAppliedAlertDescription')}</Alert.Item>
      </Alert>

      <Alert
        active={showAttention}
        variant="info"
        title={t('fellowship.salary.retentionAlertTitle')}
        onClose={evidenceInfo.hideAttention}
      >
        <Alert.Item withDot={false}>{t('fellowship.salary.retentionAlertDescription')}</Alert.Item>
      </Alert>
    </Box>
  );
});
