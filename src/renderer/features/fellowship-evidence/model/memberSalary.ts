import { BN_ZERO } from '@polkadot/util';
import { combine, sample } from 'effector';

import { attachToFeatureInput } from '@/shared/feature';
import { nullable } from '@/shared/lib/utils';
import { salary as salaryModel, salaryService } from '@/domains/collectives';
import { fellowshipNetwork } from '@/aggregates/fellowship-network';

import { fellowshipEvidenceFeature } from './feature';
import { fellowship } from './fellowship';
import { profile } from './profile';

const $statuses = salaryModel.$status.map(s => s['fellowship'] ?? {});
const $claimantStatuses = fellowship.$store.map(store => store?.claimantStatus ?? {});

const $status = combine(fellowshipEvidenceFeature.input, $statuses, (featureInput, statuses) => {
  if (nullable(featureInput)) return null;

  return statuses[featureInput.chainId] ?? null;
});

const $salaries = salaryModel.$salaries.map(s => s['fellowship'] ?? {});

const $chainSalaries = combine(fellowshipEvidenceFeature.input, $salaries, (featureInput, salaries) => {
  if (nullable(featureInput)) return null;

  return salaries[featureInput.chainId] ?? null;
});

const $memberSalary = combine(profile.$member, $chainSalaries, (member, salaries) => {
  if (nullable(member) || nullable(salaries)) {
    return {
      active: BN_ZERO,
      passive: BN_ZERO,
    };
  }

  return salaryService.getMemberSalary(member, salaries);
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
  clock: fellowshipEvidenceFeature.running,
  target: [salaryModel.requestStatus, salaryModel.requestSalaries],
});

const memberUpdated = attachToFeatureInput(fellowshipEvidenceFeature, profile.$member).filterMap(({ data, input }) => {
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
