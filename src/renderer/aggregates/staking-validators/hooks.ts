import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { nullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type EraValidatorMap, type ScoreBreakdown, recommendationsService, useEraValidators } from '@/domains/staking';
import { networkModel } from '@/entities/network';

import { type CriteriaFlags, stakingValidators } from './model';

/**
 * Keeps the scoped chain's elected set loaded for as long as `enabled`.
 *
 * Every store below only _reads_ the elected set; this is the one place that
 * asks for it. It is deliberately on demand: the read walks the whole era —
 * ~600 validators plus their exposures, preferences, reward points and slashes
 * — which is far too much to spend on the chance that somebody opens a
 * validator screen. The request is keyed by (chain, era), so re-opening within
 * the same era is answered from cache rather than refetched.
 */
export const useElectedValidators = (enabled: boolean) => {
  const chainId = useUnit(stakingValidators.$chainId);
  const chain = useUnit(stakingValidators.$chain);
  const era = useUnit(stakingValidators.$era);
  const apis = useUnit(networkModel.$apis);

  const api = apis[chainId] ?? null;
  // Asset Hub has no Babe pallet, so the APY behind each row needs the relay's
  // era timing; without a relay connection the chain stands in for itself.
  const timelineApi = (chain?.parentId ? apis[chain.parentId] : null) ?? api;

  return useEraValidators({
    chainId: enabled ? chainId : null,
    api: enabled ? api : null,
    era: enabled ? era : null,
    timelineApi,
  });
};

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
