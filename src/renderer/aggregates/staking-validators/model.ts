import { attach, combine, createEvent, createStore, sample } from 'effector';
import { persist } from 'effector-storage/local';

import { type ChainId, type EraIndex } from '@/shared/core';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { identity } from '@/domains/network';
import {
  type EraValidator,
  type EraValidatorMap,
  type IdentityParentMap,
  type RecommendationCriteria,
  DEFAULT_RECOMMENDATION_CRITERIA,
  buildOperatorClusters,
  era,
  recommendationsService,
  validators,
  validatorsService,
} from '@/domains/staking';
import { networkModel } from '@/entities/network';
import { stakingNetwork } from '@/aggregates/staking-network';

/**
 * Everything the user can toggle - the limit comes from the chain, not the
 * user.
 */
type CriteriaFlags = Omit<RecommendationCriteria, 'limit'>;

export const STAKING_RECOMMENDATION_CRITERIA = 'staking_recommendation_criteria';

/**
 * Nomination slots assumed when no api is connected yet. Matches the staking
 * pallet's own default, so the "N of 16 slots" hint is never blank while the
 * chain is still connecting.
 */
const FALLBACK_MAX_NOMINATIONS = 16;

const EMPTY_VALIDATORS: EraValidatorMap = {};
const EMPTY_PARENTS: IdentityParentMap = {};

const setCriteria = createEvent<Partial<CriteriaFlags>>();
const resetCriteria = createEvent();

/**
 * Raw persisted payload. Never read directly by the app - localStorage can hold
 * anything (an older shape, a half-written value, a hand-edited entry), so the
 * value consumers see is the validated `$criteria` derived from it.
 *
 * Exported for tests, which seed it the way `persist` hydrates it.
 */
export const $persistedCriteria = createStore<unknown>(DEFAULT_RECOMMENDATION_CRITERIA);

persist({
  key: STAKING_RECOMMENDATION_CRITERIA,
  store: $persistedCriteria,
  sync: true,
});

$persistedCriteria.on(setCriteria, (state, patch) => ({ ...normalizeCriteria(state), ...patch }));
$persistedCriteria.reset(resetCriteria);

const $criteria = $persistedCriteria.map(normalizeCriteria);

/**
 * Chain the validator set is served for.
 *
 * Defaults to the staking network selected on the classic Staking page, but any
 * consumer may scope it explicitly - the dashboard holds positions on several
 * chains at once, so "change validators" on a Kusama position must not serve
 * the Polkadot set just because Polkadot is the selected network. `null`
 * restores the default.
 */
const scopeChain = createEvent<ChainId | null>();

const $requestedChainId = createStore<ChainId | null>(null).on(scopeChain, (_, chainId) => chainId);

const $chainId = combine(
  $requestedChainId,
  stakingNetwork.$selectedChainId,
  (requested, selected) => requested ?? selected,
);

const $chain = combine($chainId, networkModel.$chains, (chainId, chains) => chains[chainId] ?? null);

const $api = combine($chainId, networkModel.$apis, (chainId, apis) => apis[chainId] ?? null);

/**
 * Active era of the scoped chain, `null` until the era subscription reports
 * one.
 */
const $era = combine($chainId, era.eraResource.$cache, (chainId, cache): EraIndex | null => cache[chainId] ?? null);

const $validators = combine(
  $chainId,
  validators.validatorsResource.$cache,
  (chainId, cache) => cache[chainId] ?? EMPTY_VALIDATORS,
);

const $validatorList = $validators.map(map => Object.values(map));

/**
 * True while the elected set of the selected chain has not landed yet. The
 * validators resource caches per chain and never goes stale, so "no entry for
 * this chain" is exactly "still loading" from the user's point of view.
 */
const $pending = combine($chainId, validators.validatorsResource.$cache, (chainId, cache) => nullable(cache[chainId]));

const $maxNominations = $api.map(api =>
  nonNullable(api) ? validatorsService.getMaxValidators(api) : FALLBACK_MAX_NOMINATIONS,
);

const $identityParents = combine($chainId, identity.$list, (chainId, identities) => {
  const chainIdentities = identities[chainId];

  return nullable(chainIdentities) ? EMPTY_PARENTS : buildOperatorClusters(chainIdentities);
});

const $recommendedValidators = combine(
  {
    validators: $validatorList,
    identityParents: $identityParents,
    criteria: $criteria,
    limit: $maxNominations,
  },
  ({ validators, identityParents, criteria, limit }): EraValidator[] => {
    return recommendationsService.recommendValidators(validators, identityParents, { ...criteria, limit });
  },
);

const $recommended = $recommendedValidators.map(list => list.map(validator => validator.accountId));

/** How many of the `$maxNominations` slots the recommendation actually fills. */
const $recommendedCount = $recommended.map(list => list.length);

const requestIdentitiesFx = attach({ effect: identity.request });

// The elected set is only known after the validators request resolves, so the
// identity lookup is driven by the resource result rather than by a derived store.
sample({
  clock: validators.validatorsResource.push,
  source: $chainId,
  filter: (chainId, { params, result }) => params.chainId === chainId && Object.keys(result).length > 0,
  fn: (chainId, { result }) => ({ chainId, accounts: collectAccountIds(result) }),
  target: requestIdentitiesFx,
});

// Switching to a chain whose elected set is already cached emits no `push`, so
// its identities have to be asked for separately.
sample({
  clock: $chainId,
  source: validators.validatorsResource.$cache,
  filter: (cache, chainId) => nonNullable(cache[chainId]),
  fn: (cache, chainId) => ({ chainId, accounts: collectAccountIds(cache[chainId] ?? EMPTY_VALIDATORS) }),
  target: requestIdentitiesFx,
});

function collectAccountIds(map: EraValidatorMap): AccountId[] {
  return Object.values(map).map(validator => validator.accountId);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readFlag(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

/**
 * Turns whatever localStorage returned into a complete set of flags: every key
 * that is missing or not a boolean falls back to its default, so a stale or
 * corrupt payload can never leak `undefined` into the recommendation criteria.
 *
 * Reading key by key is also what makes a retired criterion harmless: an entry
 * written before `excludeOversubscribed` was dropped still hydrates, and the
 * flag that no longer exists is simply not read.
 */
function normalizeCriteria(value: unknown): CriteriaFlags {
  const source = isRecord(value) ? value : {};

  return {
    excludeSlashed: readFlag(source['excludeSlashed'], DEFAULT_RECOMMENDATION_CRITERIA.excludeSlashed),
    requireIdentity: readFlag(source['requireIdentity'], DEFAULT_RECOMMENDATION_CRITERIA.requireIdentity),
    limitClusters: readFlag(source['limitClusters'], DEFAULT_RECOMMENDATION_CRITERIA.limitClusters),
  };
}

export const stakingValidators = {
  $chainId,
  $chain,
  $era,
  $validators,
  $validatorList,
  $recommendedValidators,
  $identityParents,
  $criteria,
  $maxNominations,
  $recommended,
  $recommendedCount,
  $pending,

  scopeChain,
  setCriteria,
  resetCriteria,
};

export type { CriteriaFlags };
