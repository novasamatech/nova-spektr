import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { nonNullable } from '@/shared/lib/utils';
import { Icon } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { salaryService } from '@/domains/collectives';
import { useFellowshipMemberLeftToDemotion } from '@/aggregates/fellowship-member';
import { useCurrentSalaryPeriod } from '@/aggregates/fellowship-network';
import { useMemberEvidence } from '../hooks/useMemberEvidence';
import { useMemberSalaryClaimStatus } from '../hooks/useMemberSalaryClaimStatus';

import { DotIndicator } from './DotIndicator';
import { EvidenceSalaryModal } from './EvidenceSalaryModal';

export const EntrypointCard = memo(() => {
  const { t } = useI18n();
  const { data: leftToDemotion } = useFellowshipMemberLeftToDemotion();
  const { data: evidence } = useMemberEvidence();
  const { data: currentPeriod } = useCurrentSalaryPeriod();
  const { data: claimStatus } = useMemberSalaryClaimStatus();

  const hasRetentionEvidence = evidence?.wish === 'Retention';

  let canRequestSalary = false;
  let canRequestSalaryPayout = false;
  let isSalaryRequested = false;
  let isPayoutRequested = false;

  if (nonNullable(claimStatus) && nonNullable(currentPeriod)) {
    canRequestSalary = salaryService.canRequestSalary(claimStatus, currentPeriod);
    canRequestSalaryPayout = salaryService.canRequestSalaryPayout(claimStatus, currentPeriod);
    isSalaryRequested = salaryService.isClaimantRequestedSalary(claimStatus, currentPeriod);
    isPayoutRequested = salaryService.isClaimantRequestedSalaryPayout(claimStatus, currentPeriod);
  }

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
