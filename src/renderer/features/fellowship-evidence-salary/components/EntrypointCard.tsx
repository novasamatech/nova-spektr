import { useUnit } from 'effector-react';
import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { nonNullable } from '@/shared/lib/utils';
import { Icon } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { salaryService } from '@/domains/collectives';
import { evidenceInfo } from '../model/evidence';
import { memberSalary } from '../model/memberSalary';

import { DotIndicator } from './DotIndicator';
import { EvidenceSalaryModal } from './EvidenceSalaryModal';

export const EntrypointCard = memo(() => {
  const { t } = useI18n();
  const leftToDemotion = useUnit(evidenceInfo.$leftToDemotion);
  const hasRetentionEvidence = useUnit(evidenceInfo.$hasRetentionEvidence);
  const currentPeriod = useUnit(memberSalary.$currentPeriod);
  const claimStatus = useUnit(memberSalary.$memberClaimStatus);

  const canRequestSalary =
    nonNullable(claimStatus) &&
    nonNullable(currentPeriod) &&
    salaryService.canRequestSalary(claimStatus, currentPeriod);
  const canRequestSalaryPayout =
    nonNullable(claimStatus) &&
    nonNullable(currentPeriod) &&
    salaryService.canRequestSalaryPayout(claimStatus, currentPeriod);
  const isSalaryRequested =
    nonNullable(claimStatus) &&
    nonNullable(currentPeriod) &&
    salaryService.isClaimantRequestedSalary(claimStatus, currentPeriod);
  const isPayoutRequested =
    nonNullable(claimStatus) &&
    nonNullable(currentPeriod) &&
    salaryService.isClaimantRequestedSalaryPayout(claimStatus, currentPeriod);

  const needEvidenceAttention = leftToDemotion && leftToDemotion > 0 && !hasRetentionEvidence;
  const needSalaryAttention =
    (canRequestSalary && !isSalaryRequested) || (canRequestSalaryPayout && !isPayoutRequested);
  const showIndicator = needEvidenceAttention || needSalaryAttention;

  return (
    <EvidenceSalaryModal>
      <button className="cursor-pointer rounded-xl border border-filter-border bg-card-background text-button-small">
        <Box direction="row" verticalAlign="center" horizontalAlign="space-between" gap={2} padding={4}>
          <Box direction="row" verticalAlign="center" gap={2} grow={1}>
            <Icon name="defaultExplorer" size={16} />
            <Box grow={1} horizontalAlign="start">
              {t('fellowship.salary.cardTitle')}
            </Box>
            {showIndicator && <DotIndicator />}
          </Box>

          <Icon name="right" size={16} />
        </Box>
      </button>
    </EvidenceSalaryModal>
  );
});
