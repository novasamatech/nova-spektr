import { BN_ZERO } from '@polkadot/util';
import { combine, sample } from 'effector';

import { attachToFeatureInput } from '@/shared/feature';
import { nullable } from '@/shared/lib/utils';
import { salary as salaryModel, salaryService } from '@/domains/collectives';

import { block } from './block';
import { fellowshipSalaryFeature } from './feature';
import { member } from './member';

const $statuses = salaryModel.$status.map(s => s['fellowship'] ?? {});
const $fellowshipClaimantStatuses = salaryModel.$claimantStatus.map(s => s['fellowship'] ?? {});

const $status = combine(fellowshipSalaryFeature.input, $statuses, (featureInput, statuses) => {
  if (nullable(featureInput)) return null;

  return statuses[featureInput.chainId] ?? null;
});

const $chainClaimantStatuses = combine(
  fellowshipSalaryFeature.input,
  $fellowshipClaimantStatuses,
  (featureInput, statuses) => {
    if (nullable(featureInput)) return null;

    return statuses[featureInput.chainId] ?? null;
  },
);

const $salaries = salaryModel.$salaries.map(s => s['fellowship'] ?? {});

const $chainSalaries = combine(fellowshipSalaryFeature.input, $salaries, (featureInput, salaries) => {
  if (nullable(featureInput)) return null;

  return salaries[featureInput.chainId] ?? null;
});

const $memberSalary = combine(member.$member, $chainSalaries, (member, salaries) => {
  if (nullable(member) || nullable(salaries)) {
    return {
      active: BN_ZERO,
      passive: BN_ZERO,
    };
  }

  return salaryService.getMemberSalary(member, salaries);
});

const $memberClaimStatus = combine(member.$member, $chainClaimantStatuses, (member, statuses) => {
  if (nullable(member)) return null;
  return statuses?.[member.accountId] ?? null;
});

const $currentPeriod = combine($status, block.$currentBlock, (status, currentBlock) => {
  if (nullable(status)) return null;
  return salaryService.getCurrentPeriod(status, currentBlock);
});

sample({
  clock: fellowshipSalaryFeature.running,
  target: [salaryModel.requestStatus, salaryModel.requestSalaries],
});

const memberUpdated = attachToFeatureInput(fellowshipSalaryFeature, member.$member).filterMap(({ data, input }) => {
  if (!data) return;

  return {
    api: input.api,
    chainId: input.chainId,
    palletType: input.palletType,
    accounts: [data.accountId],
  };
});

sample({
  clock: memberUpdated,
  target: salaryModel.requestClaimantStatus,
});

export const memberSalary = {
  $status,
  $currentPeriod,
  $memberSalary,
  $memberClaimStatus,
};
