import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { nullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type EraValidatorMap, type ScoreBreakdown, recommendationsService } from '@/domains/staking';

import { type CriteriaFlags, stakingValidators } from './model';

type StakingValidators = {
  validators: EraValidatorMap;
  recommended: AccountId[];
  recommendedCount: number;
  criteria: CriteriaFlags;
  maxNominations: number;
  pending: boolean;
};

export const useStakingValidators = (): StakingValidators => {
  return useUnit({
    validators: stakingValidators.$validators,
    recommended: stakingValidators.$recommended,
    recommendedCount: stakingValidators.$recommendedCount,
    criteria: stakingValidators.$criteria,
    maxNominations: stakingValidators.$maxNominations,
    pending: stakingValidators.$pending,
  });
};

type CriteriaControls = [criteria: CriteriaFlags, set: (patch: Partial<CriteriaFlags>) => void, reset: () => void];

export const useRecommendationCriteria = (): CriteriaControls => {
  const criteria = useUnit(stakingValidators.$criteria);
  const setCriteria = useUnit(stakingValidators.setCriteria);
  const resetCriteria = useUnit(stakingValidators.resetCriteria);

  return [criteria, setCriteria, resetCriteria];
};

/**
 * Why a validator scores the way it does, measured against the whole elected
 * set - not against the recommended subset, so the bars stay comparable between
 * a recommended validator and one the user picked by hand.
 */
export const useValidatorScore = (accountId: AccountId | null): ScoreBreakdown | null => {
  const validators = useUnit(stakingValidators.$validators);

  return useMemo(() => {
    if (nullable(accountId)) return null;

    const validator = validators[accountId];
    if (nullable(validator)) return null;

    return recommendationsService.getScoreBreakdown(validator, Object.values(validators));
  }, [accountId, validators]);
};
