import { BN_ZERO } from '@polkadot/util';
import { combine } from 'effector';

import { nullable } from '@/shared/lib/utils';
import { salary as salaryModel, salaryService } from '@/domains/collectives';
import { fellowshipNetwork } from '@/aggregates/fellowship-network';

import { fellowshipTasksFeature } from './feature';
import { fellowship } from './fellowship';

const $member = fellowshipTasksFeature.input.map(store => (store ? store.member : null));
const $status = fellowship.$store.map(s => s?.salaryStatus ?? null);
const $fellowshipClaimantStatuses = salaryModel.claimantStatusResource.$cache.map(s => s['fellowship'] ?? {});

const $chainClaimantStatuses = combine(
  fellowshipTasksFeature.input,
  $fellowshipClaimantStatuses,
  (featureInput, statuses) => {
    if (nullable(featureInput)) return null;

    return statuses[featureInput.chainId] ?? null;
  },
);

const $salaries = salaryModel.salariesResource.$cache.map(s => s['fellowship'] ?? {});

const $chainSalaries = combine(fellowshipTasksFeature.input, $salaries, (featureInput, salaries) => {
  if (nullable(featureInput)) return null;

  return salaries[featureInput.chainId] ?? null;
});

const $memberSalary = combine($member, $chainSalaries, (member, salaries) => {
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

const $memberClaimStatus = combine($member, $chainClaimantStatuses, (member, statuses) => {
  if (nullable(member)) return null;
  return statuses?.[member.accountId] ?? null;
});

const $currentPeriod = combine($status, fellowshipNetwork.$currentBlock, (status, currentBlock) => {
  if (nullable(status) || nullable(currentBlock)) return null;
  return salaryService.getCurrentPeriod(status, currentBlock);
});

export const memberSalary = {
  $status,
  $currentPeriod,
  $memberSalary,
  $memberClaimStatus,
};
