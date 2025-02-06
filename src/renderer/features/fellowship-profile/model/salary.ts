import { BN_ZERO } from '@polkadot/util';
import { combine } from 'effector';

import { nullable } from '@/shared/lib/utils';
import { salary, salaryService } from '@/domains/collectives';

import { fellowshipProfileFeature } from './feature';
import { profile } from './profile';

const $salaries = salary.$salaries.map(s => s['fellowship'] ?? {});

const $chainSalaries = combine(fellowshipProfileFeature.input, $salaries, (featureInput, salaries) => {
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

export const memberSalary = {
  $memberSalary,
};
