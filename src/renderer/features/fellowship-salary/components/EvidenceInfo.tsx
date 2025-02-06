import { useUnit } from 'effector-react';
import { memo, useEffect, useState } from 'react';

import { getRelativeTimeFromApi } from '@/shared/lib/utils';
import { Duration } from '@/shared/ui';
import { CollectiveRank } from '@/shared/ui-entities';
import { Box } from '@/shared/ui-kit';
import { retentionEvidence } from '../model/evidence';
import { fellowshipSalaryFeature } from '../model/feature';
import { member } from '../model/member';

export const EvidenceInfo = memo(() => {
  // const { t } = useI18n();
  const [timeLeft, setTimeLeft] = useState(0);

  const input = useUnit(fellowshipSalaryFeature.input);
  const currentMember = useUnit(member.$member);
  // const memberEvidence = useUnit(retentionEvidence.$memberEvidence);
  // const periods = useUnit(retentionEvidence.$periods);
  const track = useUnit(retentionEvidence.$track);
  const currentPeriod = useUnit(retentionEvidence.$currentPeriod);
  // const hasEvidence = nonNullable(memberEvidence);

  useEffect(() => {
    if (input?.api && currentPeriod) {
      getRelativeTimeFromApi(currentPeriod.left, input.api).then(setTimeLeft);
    }
  }, [input?.api, currentPeriod]);

  // const canInteractWithSalary = nonNullable(claimStatus) && claimStatus.type !== 'none';
  // const canRequestSalary =
  //   nonNullable(claimStatus) &&
  //   nonNullable(currentPeriod) &&
  //   salaryService.canRequestSalary(claimStatus, currentPeriod);
  // const canRequestSalaryPayout =
  //   nonNullable(claimStatus) &&
  //   nonNullable(currentPeriod) &&
  //   salaryService.canRequestSalaryPayout(claimStatus, currentPeriod);
  // const isSalaryRequested =
  //   nonNullable(claimStatus) &&
  //   nonNullable(currentPeriod) &&
  //   salaryService.isClaimantRequestedSalary(claimStatus, currentPeriod);
  // const isPayoutRequested =
  //   nonNullable(claimStatus) &&
  //   nonNullable(currentPeriod) &&
  //   salaryService.isClaimantRequestedSalaryPayout(claimStatus, currentPeriod);

  return (
    <Box padding={[4, 5, 5]} gap={6}>
      <CollectiveRank rank={currentMember?.rank ?? 0}>{track?.name.replace(/s$/, '')}</CollectiveRank>
      <span>{currentPeriod?.type}</span>
      <Duration seconds={timeLeft / 1000} />
    </Box>
  );
});
