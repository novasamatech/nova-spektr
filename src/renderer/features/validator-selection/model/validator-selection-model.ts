import { combine, createEvent, createStore, sample } from 'effector';

import { type Asset, type Chain, type EraIndex, type Validator, type Wallet } from '@/shared/core';
import { nonNullable, nullable, toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AccountIdentity, type AnyAccount, identity } from '@/domains/network';
import {
  type EraValidator,
  type ScoreBreakdown,
  mapEraValidatorToLegacy,
  recommendationsService,
} from '@/domains/staking';
import { type CriteriaFlags, stakingValidators } from '@/aggregates/staking-validators';
import {
  type DisplayedStrings,
  type FiltersState,
  type SelectionInput,
  type SigningInfo,
  type SigningMode,
  type SortState,
  DEFAULT_FILTERS,
  DEFAULT_SORT,
  applyFilters,
  filtersDiffer,
  getClusterPositions,
  searchValidators,
  sortValidators,
} from '../lib';

const EMPTY_IDENTITIES: Record<AccountId, AccountIdentity> = {};
const EMPTY_SELECTION: AccountId[] = [];

const formInitiated = createEvent<SelectionInput>();
const formCleared = createEvent();

const queryChanged = createEvent<string>();
const sortChanged = createEvent<SortState>();
const filtersChanged = createEvent<Partial<FiltersState>>();
const filtersReset = createEvent();
const criteriaChanged = createEvent<Partial<CriteriaFlags>>();
const clearSearchAndFilters = createEvent();

const fillWithRecommended = createEvent();
const deselectAll = createEvent();
const validatorToggled = createEvent<EraValidator>();
const validatorsSubmitted = createEvent();

const detailOpened = createEvent<AccountId>();
const detailClosed = createEvent();

// --- what the host handed over -------------------------------------------------

const $chain = createStore<Chain | null>(null)
  .on(formInitiated, (_, { chain }) => chain)
  .reset(formCleared);

const $asset = createStore<Asset | null>(null)
  .on(formInitiated, (_, { asset }) => asset)
  .reset(formCleared);

const $signingMode = createStore<SigningMode>('local')
  .on(formInitiated, (_, { signingMode }) => signingMode ?? 'local')
  .reset(formCleared);

const $initiatorWallet = createStore<Wallet | null>(null)
  .on(formInitiated, (_, { initiatorWallet }) => initiatorWallet ?? null)
  .reset(formCleared);

const $initiator = createStore<AnyAccount | null>(null)
  .on(formInitiated, (_, { initiator }) => initiator ?? null)
  .reset(formCleared);

const $signingInfo = createStore<SigningInfo | null>(null)
  .on(formInitiated, (_, { signingInfo }) => signingInfo ?? null)
  .reset(formCleared);

/**
 * The nominations the account holds today - preselected, and the read-only
 * checks of watch-only mode.
 */
const $nominatedIds = createStore<AccountId[]>(EMPTY_SELECTION)
  .on(formInitiated, (_, { nominatedIds }) => nominatedIds ?? EMPTY_SELECTION)
  .reset(formCleared);

// --- what the user is doing to the table ---------------------------------------

const $query = createStore('')
  .on(queryChanged, (_, query) => query)
  .reset([formCleared, clearSearchAndFilters]);

const $sort = createStore<SortState>(DEFAULT_SORT)
  .on(sortChanged, (_, sort) => sort)
  .reset(formCleared);

const $filters = createStore<FiltersState>(DEFAULT_FILTERS)
  .on(filtersChanged, (state, patch) => ({ ...state, ...patch }))
  .reset([formCleared, filtersReset, clearSearchAndFilters]);

const $selected = createStore<AccountId[]>(EMPTY_SELECTION)
  .on(formInitiated, (_, { nominatedIds }) => nominatedIds ?? EMPTY_SELECTION)
  .reset(formCleared);

const $detailAccountId = createStore<AccountId | null>(null)
  .on(detailOpened, (_, accountId) => accountId)
  .reset([detailClosed, formCleared]);

// --- displayed strings ---------------------------------------------------------

const $identities = combine($chain, identity.$list, (chain, list) => {
  return nullable(chain) ? EMPTY_IDENTITIES : (list[chain.chainId] ?? EMPTY_IDENTITIES);
});

/**
 * A sub-identity carries its operator's display name plus its own suffix, and
 * the row shows both - `Operator A/node-2` is what tells two nodes of one
 * operator apart.
 */
const $displayedNames = combine(stakingValidators.$validatorList, $identities, (validators, identities) => {
  const names: Record<AccountId, string> = {};

  for (const validator of validators) {
    const accountIdentity = identities[validator.accountId];
    if (nullable(accountIdentity)) continue;

    const name = accountIdentity.subName ? `${accountIdentity.name}/${accountIdentity.subName}` : accountIdentity.name;

    if (name.length > 0) {
      names[validator.accountId] = name;
    }
  }

  return names;
});

const $displayedAddresses = combine(stakingValidators.$validatorList, $chain, (validators, chain) => {
  const addresses: Record<AccountId, string> = {};
  if (nullable(chain)) return addresses;

  for (const validator of validators) {
    addresses[validator.accountId] = toAddress(validator.accountId, { prefix: chain.addressPrefix });
  }

  return addresses;
});

const $displayed = combine($displayedNames, $displayedAddresses, (names, addresses): DisplayedStrings => {
  return { names, addresses };
});

// --- the table -----------------------------------------------------------------

/**
 * Numbered in recommendation order, not in the user's current sort - see
 * `getClusterPositions`. Sorting the table must not change what "3rd in
 * cluster" means.
 */
const $clusterPositions = combine(
  stakingValidators.$validatorList,
  stakingValidators.$identityParents,
  (validators, identityParents) => getClusterPositions(sortValidators(validators, DEFAULT_SORT), identityParents),
);

const $sortedValidators = combine(
  { validators: stakingValidators.$validatorList, sort: $sort, displayed: $displayed },
  ({ validators, sort, displayed }) => sortValidators(validators, sort, displayed),
);

const $visibleValidators = combine(
  {
    validators: $sortedValidators,
    filters: $filters,
    identityParents: stakingValidators.$identityParents,
    query: $query,
    displayed: $displayed,
  },
  ({ validators, filters, identityParents, query, displayed }) => {
    return searchValidators(applyFilters(validators, filters, identityParents), query, displayed);
  },
);

const $filtersDiffer = $filters.map(filtersDiffer);

// --- selection -----------------------------------------------------------------

const $selectedCount = $selected.map((selected) => selected.length);

const $selectedShownCount = combine($selected, $visibleValidators, (selected, visible) => {
  const selectedIds = new Set(selected);

  return visible.filter((validator) => selectedIds.has(validator.accountId)).length;
});

/**
 * Mean APY of the picked set, ignoring validators the chain reports no APY for
 *
 * - Counting those as zero would understate the estimate rather than admit it is
 *   partial. `null` when nothing selected carries an APY at all.
 */
const $estimatedSetApy = combine($selected, stakingValidators.$validators, (selected, validators) => {
  const values = selected
    .map((accountId) => validators[accountId]?.apy)
    .filter((apy): apy is number => typeof apy === 'number');

  if (values.length === 0) return null;

  return values.reduce((sum, apy) => sum + apy, 0) / values.length;
});

const $canSubmit = combine(
  { count: $selectedCount, maxNominations: stakingValidators.$maxNominations, signingMode: $signingMode },
  ({ count, maxNominations, signingMode }) => {
    return count > 0 && count <= maxNominations && signingMode !== 'watchOnly';
  },
);

// --- detail --------------------------------------------------------------------

const $detailValidator = combine($detailAccountId, stakingValidators.$validators, (accountId, validators) => {
  return nullable(accountId) ? null : (validators[accountId] ?? null);
});

const $detailScore = combine(
  $detailValidator,
  stakingValidators.$validatorList,
  (validator, all): ScoreBreakdown | null => {
    return nullable(validator) ? null : recommendationsService.getScoreBreakdown(validator, all);
  },
);

// --- footer / toolbar numbers (no sentences - i18n lives in the UI) -------------

const $meta = combine(
  stakingValidators.$validatorList,
  stakingValidators.$era,
  (validators, era): { validatorCount: number; era: EraIndex | null } => {
    return { validatorCount: validators.length, era };
  },
);

const $showingNote = combine(
  $visibleValidators,
  stakingValidators.$validatorList,
  (visible, all): { shown: number; total: number } => {
    return { shown: visible.length, total: all.length };
  },
);

const $viewNote = combine({
  selectedShown: $selectedShownCount,
  selected: $selectedCount,
  estimatedApy: $estimatedSetApy,
});

// --- behaviour -----------------------------------------------------------------

/**
 * The validator set must come from the chain the host opened the picker for.
 * Without this the aggregate would keep serving the staking network selected on
 * the classic Staking page, so changing nominations of a Kusama position while
 * Polkadot is selected would silently list Polkadot validators.
 */
sample({
  clock: formInitiated,
  fn: ({ chain }) => chain.chainId,
  target: stakingValidators.scopeChain,
});

sample({
  clock: formCleared,
  fn: () => null,
  target: stakingValidators.scopeChain,
});

sample({
  clock: criteriaChanged,
  target: stakingValidators.setCriteria,
});

/**
 * A blocked validator rejects nominations, a watch-only account cannot change
 * any, and the chain refuses a set larger than its nomination limit - in all
 * three cases the click is simply not an action, so the store never moves.
 */
sample({
  clock: validatorToggled,
  source: { selected: $selected, signingMode: $signingMode, maxNominations: stakingValidators.$maxNominations },
  filter: ({ selected, signingMode, maxNominations }, validator) => {
    if (signingMode === 'watchOnly' || validator.blocked) return false;

    return selected.includes(validator.accountId) || selected.length < maxNominations;
  },
  fn: ({ selected }, validator) => {
    return selected.includes(validator.accountId)
      ? selected.filter((accountId) => accountId !== validator.accountId)
      : [...selected, validator.accountId];
  },
  target: $selected,
});

// Replaces rather than appends: "fill with recommended" is the recommendation as
// a whole, not a merge with whatever the user had picked before.
sample({
  clock: fillWithRecommended,
  source: { recommended: stakingValidators.$recommended, signingMode: $signingMode },
  filter: ({ signingMode }) => signingMode !== 'watchOnly',
  fn: ({ recommended }) => recommended,
  target: $selected,
});

sample({
  clock: deselectAll,
  source: $signingMode,
  filter: (signingMode) => signingMode !== 'watchOnly',
  fn: () => EMPTY_SELECTION,
  target: $selected,
});

/**
 * The legacy `Validator[]` both host flows already consume. The picked order is
 * kept - it is the order the user built the set in.
 */
const formSubmitted = sample({
  clock: validatorsSubmitted,
  source: { selected: $selected, validators: stakingValidators.$validators, chain: $chain, canSubmit: $canSubmit },
  filter: ({ canSubmit }) => canSubmit,
}).filterMap(({ selected, validators, chain }): Validator[] | undefined => {
  if (nullable(chain)) return undefined;

  return selected
    .map((accountId) => validators[accountId])
    .filter(nonNullable)
    .map((validator) => mapEraValidatorToLegacy(validator, chain.chainId));
});

export const validatorSelectionModel = {
  $chain,
  $asset,
  $signingMode,
  $initiator,
  $initiatorWallet,
  $signingInfo,
  $nominatedIds,

  $query,
  $sort,
  $filters,
  $filtersDiffer,
  $criteria: stakingValidators.$criteria,

  $displayedNames,
  $displayedAddresses,
  $clusterPositions,
  $sortedValidators,
  $visibleValidators,

  $selected,
  $selectedCount,
  $selectedShownCount,
  $estimatedSetApy,
  $maxNominations: stakingValidators.$maxNominations,
  $recommended: stakingValidators.$recommended,
  $recommendedCount: stakingValidators.$recommendedCount,
  $canSubmit,

  $detailValidator,
  $detailScore,

  $meta,
  $showingNote,
  $viewNote,
  $pending: stakingValidators.$pending,

  events: {
    formInitiated,
    formCleared,
    queryChanged,
    sortChanged,
    filtersChanged,
    filtersReset,
    criteriaChanged,
    clearSearchAndFilters,
    fillWithRecommended,
    deselectAll,
    validatorToggled,
    detailOpened,
    detailClosed,
    validatorsSubmitted,
  },
  output: {
    formSubmitted,
  },
};
