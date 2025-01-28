import { BN_ZERO } from '@polkadot/util';
import { combine, sample } from 'effector';

import { nullable } from '@/shared/lib/utils';
import { salary as salaryModel, salaryService } from '@/domains/collectives';

import { block } from './block';
import { fellowshipSalaryFeature } from './feature';
import { member } from './member';

const $statuses = salaryModel.$status.map(s => s['fellowship'] ?? {});
const $salaries = salaryModel.$salaries.map(s => s['fellowship'] ?? {});

const $status = combine(fellowshipSalaryFeature.input, $statuses, (featureInput, statuses) => {
  if (nullable(featureInput)) return null;

  return statuses[featureInput.chainId] ?? null;
});

const $chainSalaries = combine(fellowshipSalaryFeature.input, $salaries, (featureInput, salaries) => {
  if (nullable(featureInput)) return null;

  return salaries[featureInput.chainId] ?? null;
});

const $memberSalary = combine(member.$member, $chainSalaries, (member, salaries) => {
  if (nullable(member)) {
    return {
      active: BN_ZERO,
      passive: BN_ZERO,
    };
  }

  return {
    active: salaries?.active.at(member.rank) ?? BN_ZERO,
    passive: salaries?.passive.at(member.rank) ?? BN_ZERO,
  };
});

const $currentPeriod = combine($status, block.$currentBlock, (status, currentBlock) => {
  if (nullable(status)) return null;

  return salaryService.getCurrentPeriod(status, currentBlock);
});

sample({
  clock: fellowshipSalaryFeature.running,
  target: [salaryModel.requestStatus, salaryModel.requestSalaries],
});

export const memberSalary = {
  $status,
  $currentPeriod,
  $memberSalary,
};
