import { combine, sample } from 'effector';

import { attachToFeatureInput } from '@/shared/feature';
import { nullable } from '@/shared/lib/utils';
import { salary as salaryModel, salaryService } from '@/domains/collectives';
import { fellowshipNetwork } from '@/aggregates/fellowship-network';

import { fellowshipEvidenceSalaryFeature } from './feature';
import { fellowship } from './fellowship';
import { profile } from './profile';

const $statuses = salaryModel.$status.map(s => s['fellowship'] ?? {});
const $claimantStatuses = fellowship.$store.map(store => store?.claimantStatus ?? {});

const $status = combine(fellowshipEvidenceSalaryFeature.input, $statuses, (featureInput, statuses) => {
  if (nullable(featureInput)) return null;

  return statuses[featureInput.chainId] ?? null;
});

const $memberClaimStatus = combine(profile.$member, $claimantStatuses, (member, statuses) => {
  if (nullable(member)) return null;

  return statuses?.[member.accountId] ?? null;
});

const $currentPeriod = combine($status, fellowshipNetwork.$currentBlock, (status, currentBlock) => {
  if (nullable(status) || nullable(currentBlock)) return null;
  return salaryService.getCurrentPeriod(status, currentBlock);
});

sample({
  clock: fellowshipEvidenceSalaryFeature.running,
  target: [salaryModel.requestStatus, salaryModel.requestSalaries],
});

const memberUpdated = attachToFeatureInput(fellowshipEvidenceSalaryFeature, profile.$member).filterMap(
  ({ data, input }) => {
    if (!data) return;

    return {
      api: input.api,
      chainId: input.chainId,
      palletType: input.palletType,
      accounts: [data.accountId],
    };
  },
);

sample({
  clock: memberUpdated,
  target: salaryModel.requestClaimantStatus,
});

export const memberSalary = {
  $currentPeriod,
  $memberClaimStatus,
};
