import { type ChainId, type Validator } from '@/shared/core';
import { type ValidatorMap } from '../types';

import { type EraValidator, type EraValidatorMap } from './types';

/**
 * Adapter to the legacy `Validator` shape from `@/shared/core`, still consumed
 * by the staking features. Fields the legacy type has but the era data does not
 * carry (`avgApy`, `nominators`) are filled with neutral values - use
 * `EraValidator` / `useExposurePages` for the real data.
 */
export function mapEraValidatorToLegacy(validator: EraValidator, chainId: ChainId): Validator {
  return {
    accountId: validator.accountId,
    chainId,
    ownStake: validator.ownStake,
    totalStake: validator.totalStake,
    commission: validator.commission,
    blocked: validator.blocked,
    slashed: validator.slashed,
    apy: validator.apy ?? 0,
    avgApy: 0,
    nominators: [],
  };
}

const legacyMaps = new WeakMap<EraValidatorMap, ValidatorMap>();

/**
 * Memoised by the identity of the source map so hooks reading the resource
 * cache keep a stable reference between renders.
 */
export function mapEraValidatorsToLegacy(validators: EraValidatorMap, chainId: ChainId): ValidatorMap {
  const cached = legacyMaps.get(validators);
  if (cached) return cached;

  const result: ValidatorMap = {};
  for (const validator of Object.values(validators)) {
    result[validator.accountId] = mapEraValidatorToLegacy(validator, chainId);
  }

  legacyMaps.set(validators, result);

  return result;
}
