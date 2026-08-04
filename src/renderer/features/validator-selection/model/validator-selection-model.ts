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
  OPEN_FILTERS,
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
const showSelectedOnlyChanged = createEvent<boolean>();

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
  // `clearSearchAndFilters` opens every bound rather than returning to the
  // defaults - it is the empty table's escape hatch, and the defaults are
  // themselves narrowing.
  .on(clearSearchAndFilters, () => OPEN_FILTERS)
  .reset([formCleared, filtersReset]);

/**
 * "Show selected" - the quick way to review a pick without hunting for it in
 * six hundred rows.
 *
 * It is a view over the selection, not a filter over the data, so it cannot
 * survive an empty selection: the moment the last validator is unchecked the
 * toggle turns itself off rather than leaving the user staring at an empty
 * table with no obvious way back. `clearSearchAndFilters` drops it for the same
 * reason it opens every other bound.
 */
const $showSelectedOnly = createStore(false)
  .on(showSelectedOnlyChanged, (_, next) => next)
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

// --- scores --------------------------------------------------------------------

/**
 * Every elected validator scored against the whole elected set, so a row's
 * score is a fact about the era rather than about what the user is currently
 * looking at. Normalising against the filtered view instead would make the same
 * validator score differently as the user types into the search box.
 */
const $scores = stakingValidators.$validatorList.map(recommendationsService.getScoreBreakdowns);

/** The order the recommender itself walks - best composite score first. */
const RECOMMENDATION_SORT: SortState = { column: 'score', direction: 'desc' };

// --- the table -----------------------------------------------------------------

/**
 * Numbered in recommendation order, not in the user's current sort - see
 * `getClusterPositions`. Sorting the table must not change what "3rd in
 * cluster" means.
 *
 * Recommendation order is the score, the same order `recommendValidators` walks
 * when it caps a cluster, so the badge names exactly the rows that cap
 * dropped.
 */
const $clusterPositions = combine(
  {
    validators: stakingValidators.$validatorList,
    identityParents: stakingValidators.$identityParents,
    scores: $scores,
  },
  ({ validators, identityParents, scores }) =>
    getClusterPositions(sortValidators(validators, RECOMMENDATION_SORT, undefined, scores), identityParents),
);

const $sortedValidators = combine(
  { validators: stakingValidators.$validatorList, sort: $sort, displayed: $displayed, scores: $scores },
  ({ validators, sort, displayed, scores }) => sortValidators(validators, sort, displayed, scores),
);

const $visibleValidators = combine(
  {
    validators: $sortedValidators,
    filters: $filters,
    identityParents: stakingValidators.$identityParents,
    query: $query,
    displayed: $displayed,
    showSelectedOnly: $showSelectedOnly,
    selected: $selected,
  },
  ({ validators, filters, identityParents, query, displayed, showSelectedOnly, selected }) => {
    const filtered = applyFilters(validators, filters, identityParents);
    // Narrowed before search and filters are applied to it, so a query still
    // searches within the pick rather than escaping it.
    const scoped = showSelectedOnly ? filtered.filter((validator) => selected.includes(validator.accountId)) : filtered;

    return searchValidators(scoped, query, displayed);
  },
);

// The toggle is a view over the selection, so an empty selection retires it.
sample({
  clock: $selected,
  filter: (selected) => selected.length === 0,
  fn: () => false,
  target: showSelectedOnlyChanged,
});

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

const $detailScore = combine($detailAccountId, $scores, (accountId, scores): ScoreBreakdown | null => {
  return nullable(accountId) ? null : (scores[accountId] ?? null);
});

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
 *
 * Removing is the exception: a validator already in the set is always
 * removable. `blocked` is a state a nominated validator can enter _after_ it
 * was picked, and refusing the click in that direction too would trap it in the
 * set with no way out but replacing the whole selection.
 */
sample({
  clock: validatorToggled,
  source: { selected: $selected, signingMode: $signingMode, maxNominations: stakingValidators.$maxNominations },
  filter: ({ selected, signingMode, maxNominations }, validator) => {
    if (signingMode === 'watchOnly') return false;
    if (selected.includes(validator.accountId)) return true;
    if (validator.blocked) return false;

    return selected.length < maxNominations;
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
//
// Which is exactly why an empty recommendation must not go through: while the
// elected set is still loading `$recommended` is `[]`, and replacing with it
// would silently wipe the nominations the modal was opened on.
sample({
  clock: fillWithRecommended,
  source: { recommended: stakingValidators.$recommended, signingMode: $signingMode },
  filter: ({ signingMode, recommended }) => signingMode !== 'watchOnly' && recommended.length > 0,
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
  $showSelectedOnly,
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
  $scores,
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
    showSelectedOnlyChanged,
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
