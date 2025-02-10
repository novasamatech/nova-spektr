import { useUnit } from 'effector-react';
import { memo, useEffect, useState } from 'react';

import { getRelativeTimeFromApi } from '@/shared/lib/utils';
import { Alert, Button, Duration, FootnoteText, SmallTitleText } from '@/shared/ui';
import { CollectiveRank } from '@/shared/ui-entities';
import { Box } from '@/shared/ui-kit';
import { memberService } from '@/domains/collectives';
import { retentionEvidence } from '../model/evidence';
import { fellowshipSalaryFeature } from '../model/feature';
import { profile } from '../model/profile';

import { RetentionEvidenceFormModal } from './RetentionEvidenceFormModal';

export const RetentionEvidenceInfo = memo(() => {
  // const { t } = useI18n();
  const [timeLeft, setTimeLeft] = useState(0);

  const input = useUnit(fellowshipSalaryFeature.input);
  const currentMember = useUnit(profile.$member);
  const track = useUnit(retentionEvidence.$track);
  const currentBlock = useUnit(retentionEvidence.$currentBlock);
  const demotionPeriod = useUnit(retentionEvidence.$demotionPeriod);
  const hasRetentionEvidence = useUnit(retentionEvidence.$hasRetentionEvidence);
  const hasPromotionEvidence = useUnit(retentionEvidence.$hasPromotionEvidence);

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
            <FootnoteText className="text-text-secondary">Retention evidence within:</FootnoteText>
            <SmallTitleText>
              <Duration seconds={timeLeft / 1000} />
            </SmallTitleText>
          </Box>
          <RetentionEvidenceFormModal>
            <Button>Submit evidence</Button>
          </RetentionEvidenceFormModal>
        </Box>
      )}

      {hasRetentionEvidence && (
        <Box direction="row">
          <Box gap={1} grow={1}>
            <FootnoteText className="text-text-secondary">Applied for retention:</FootnoteText>
            <SmallTitleText>Evidence submitted</SmallTitleText>
          </Box>
          {/*TODO implement evidence manipulation*/}
        </Box>
      )}

      {hasPromotionEvidence && (
        <Alert active variant="warn" title="Promotion evidence is uploaded">
          <Alert.Item withDot={false}>
            You are already uploaded evidence for promotion. If you want to add it for retention, you can upload it
            again — the previous one will be replaced.
          </Alert.Item>
        </Alert>
      )}
    </Box>
  );
});
