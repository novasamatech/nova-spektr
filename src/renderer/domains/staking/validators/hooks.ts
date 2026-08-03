import { type NullableMap } from '@/shared/core';
import { nonNullableMap } from '@/shared/lib/utils';
import { useResource } from '@/shared/query';
import { type ValidatorMap } from '../types';

import { mapEraValidatorsToLegacy } from './helpers';
import {
  type NominatorsResourceParams,
  type ValidatorsResourceParams,
  nominatorsCacheKey,
  nominatorsResource,
  validatorsResource,
} from './resource';
import { type EraValidatorMap } from './types';

// Re-exported so the domain keeps a single import surface for staking hooks.
export { useNetworkApy } from '../apy/hooks';

const EMPTY_LEGACY_MAP: ValidatorMap = {};
const EMPTY_ERA_MAP: EraValidatorMap = {};

/**
 * `timelineApi` only enriches the result, so it must not gate the request the
 * way `nonNullableMap` would.
 */
function resolveParams(params: NullableMap<ValidatorsResourceParams>): ValidatorsResourceParams | null {
  const { chainId, api, era, timelineApi } = params;
  const required = { chainId, api, era };

  return nonNullableMap(required) ? { ...required, timelineApi } : null;
}

/**
 * Era validators in the legacy `Validator` shape from `@/shared/core`.
 *
 * @deprecated Prefer `useEraValidators` - it exposes reward points, page counts
 *   and authored blocks that the legacy shape drops.
 */
export const useValidators = (params: NullableMap<ValidatorsResourceParams>) => {
  return useResource(validatorsResource, {
    params: resolveParams(params),
    defaultValue: EMPTY_LEGACY_MAP,
    map: (cache, { chainId }) => {
      const validators = cache[chainId];

      return validators ? mapEraValidatorsToLegacy(validators, chainId) : undefined;
    },
  });
};

export const useEraValidators = (params: NullableMap<ValidatorsResourceParams>) => {
  return useResource(validatorsResource, {
    params: resolveParams(params),
    defaultValue: EMPTY_ERA_MAP,
    map: (cache, { chainId }) => cache[chainId],
  });
};

export const useNominators = (params: NullableMap<NominatorsResourceParams>) => {
  return useResource(nominatorsResource, {
    params: nonNullableMap(params) ? params : null,
    defaultValue: EMPTY_LEGACY_MAP,
    map: (cache, { chainId, stash }) => cache[nominatorsCacheKey(chainId, stash)],
  });
};
