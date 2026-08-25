import { type ApiPromise } from '@polkadot/api';
import {
  type EventCallable,
  type Store,
  combine,
  createEffect,
  createEvent,
  createStore,
  sample,
  scopeBind,
} from 'effector';

import { type Chain, type ChainId, type EraIndex } from '@/shared/core';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type ResourceRequestKey } from '@/shared/query';
import { type AnyAccount, accountService, accounts } from '@/domains/network';
import {
  type DerivePositionInput,
  type EraAnchor,
  AssetHubChains,
  era as eraModel,
  exposurePagesCacheKey,
  exposures as exposuresModel,
  nominations as nominationsModel,
  positionsService,
  staking as stakingModel,
  validatorPrefs as validatorPrefsModel,
  validators as validatorsModel,
} from '@/domains/staking';
import { networkModel, networkUtils } from '@/entities/network';

import { summarizePositions } from './lib/summary';

const { eraResource, eraProgressResource } = eraModel;
const { exposuresResource, exposurePagesResource } = exposuresModel;
const { nominationsResource, minBondResource } = nominationsModel;
const { validatorsResource } = validatorsModel;
const { stakingResource } = stakingModel;
const { validatorPrefsResource } = validatorPrefsModel;

const reset = createEvent();

/**
 * The accounts this aggregate answers for - the dashboard's account selection,
 * as account ids.
 *
 * Deliberately not the selected wallet: the dashboard's account picker spans
 * every wallet of the installation plus the address book, and the staking tab
 * has to show exactly what that picker says. Passing the whole selection on
 * every change is the contract - the store below replaces its content rather
 * than accumulating it.
 */
const selectAccountIds = createEvent<AccountId[]>();

/**
 * Consumers of the selection announce themselves. The dashboard keeps its tabs
 * mounted once visited, so the Overview accounts table and the Staking tab both
 * hold the selection at the same time - and hiding one widget must not blank
 * the other. The selection is released only when the last consumer leaves.
 */
const retainSelection = createEvent();
const releaseSelection = createEvent();

// --- Resource pools ---
//
// The `shared/query` resources are ref-counted pools: every `start` must be
// matched by a `stop` with the very same key, or the underlying subscription
// (or in-flight request) outlives the thing that asked for it. Instead of
// scattering that bookkeeping, every resource driven here goes through one
// pool binding that diffs the desired request list against the started keys.
//
// That diff is the *only* writer of subscription state, teardown included -
// `reset` empties the request lists instead of stopping keys behind the diff's
// back. Two writers over one snapshot of the started keys would race: `reset`
// also drops the selection, which changes the request lists in the very same
// tick, so one of them would double-stop a key or leave a freshly started one
// behind.

type PooledResource<Params> = {
  start: EventCallable<Params>;
  stop: EventCallable<ResourceRequestKey>;
  createKey: (params: Params) => ResourceRequestKey;
};

type ResourcePool = {
  $activeKeys: Store<ResourceRequestKey[]>;
};

function bindResourcePool<Params>(resource: PooledResource<Params>, $requests: Store<Params[]>): ResourcePool {
  const $activeKeys = createStore<ResourceRequestKey[]>([]);

  const syncFx = createEffect(({ requests, activeKeys }: { requests: Params[]; activeKeys: ResourceRequestKey[] }) => {
    const start = scopeBind(resource.start, { safe: true });
    const stop = scopeBind(resource.stop, { safe: true });

    const desired = new Map<ResourceRequestKey, Params>();
    for (const request of requests) {
      const key = resource.createKey(request);
      if (!desired.has(key)) {
        desired.set(key, request);
      }
    }

    const active = new Set(activeKeys);

    for (const key of active) {
      if (!desired.has(key)) {
        stop(key);
      }
    }

    for (const [key, request] of desired) {
      if (!active.has(key)) {
        start(request);
      }
    }

    return [...desired.keys()];
  });

  sample({
    clock: $requests,
    source: $activeKeys,
    fn: (activeKeys, requests) => ({ requests, activeKeys }),
    target: syncFx,
  });

  $activeKeys.on(syncFx.doneData, (_, keys) => keys);

  return { $activeKeys };
}

// --- Staking chains ---
//
// The dashboard is multi-chain: every Asset Hub the running config actually
// knows about, never a hardcoded pair. Westend Asset Hub only exists in dev
// configs, so the intersection with `networkModel.$chains` is what decides.

const $stakingChains = networkModel.$chains.map(chains =>
  Object.values(AssetHubChains)
    .map(chainId => chains[chainId])
    .filter(nonNullable),
);

// --- Accounts per chain ---

type ChainAccounts = {
  chain: Chain;
  chainId: ChainId;
  accountIds: AccountId[];
};

/**
 * The selection, kept sorted and deduplicated so an identical selection never
 * churns the pooled subscriptions - the account list is part of every ledger
 * and nominations key.
 */
const $selectedAccountIds = createStore<AccountId[]>([], {
  updateFilter: (next, current) =>
    next.length !== current.length || next.some((accountId, index) => accountId !== current[index]),
});

$selectedAccountIds.on(selectAccountIds, (_, accountIds) => [...new Set(accountIds)].sort());

const $selectionConsumers = createStore(0)
  .on(retainSelection, count => count + 1)
  .on(releaseSelection, count => Math.max(0, count - 1));

const lastConsumerLeft = sample({
  clock: releaseSelection,
  source: $selectionConsumers,
  filter: count => count === 0,
});

$selectedAccountIds.reset(reset, lastConsumerLeft);

// `reset` and the last consumer leaving both empty the selection; an empty
// selection leaves every chain with no accounts, every request list empty, and
// the pool diff releases every key. Nothing else needs to remember "wanted
// nothing".

/**
 * Local account objects of the selection, by account id. Only the selected ones
 * are indexed - the installation may hold thousands of accounts and this
 * recomputes on every selection change.
 */
const $selectedLocalAccounts = combine(
  $selectedAccountIds,
  accounts.$list,
  (selectedAccountIds, allAccounts): Map<AccountId, AnyAccount[]> => {
    const result = new Map<AccountId, AnyAccount[]>();
    if (selectedAccountIds.length === 0) return result;

    const selected = new Set(selectedAccountIds);
    for (const account of allAccounts) {
      if (!selected.has(account.accountId)) continue;

      const existing = result.get(account.accountId);
      if (existing) {
        existing.push(account);
      } else {
        result.set(account.accountId, [account]);
      }
    }

    return result;
  },
);

const $chainAccounts = combine(
  {
    chains: $stakingChains,
    selectedAccountIds: $selectedAccountIds,
    localAccounts: $selectedLocalAccounts,
  },
  ({ chains, selectedAccountIds, localAccounts }): ChainAccounts[] => {
    return chains.map(chain => {
      const accountIds = selectedAccountIds.filter(accountId => {
        const local = localAccounts.get(accountId);

        // A wallet account carries its own key scheme and chain binding, so it
        // only joins the chains that can actually hold it. The same key can
        // live in several wallets (a chain-bound account here, a universal one
        // there): one wallet able to hold it on the chain is enough.
        if (nonNullable(local)) {
          return local.some(account => accountService.isAccountAvailableOnChain(account, chain));
        }

        // An address-book row is a bare address with no account object behind
        // it, so the full availability check has nothing to run against - but
        // its key scheme is checkable, and it must be checked. An Ethereum-style
        // 20 byte id cannot be a stash on an AccountId32 chain, and
        // `staking.bonded.multi` rejects the *whole* batch when a single key is
        // unencodable: one such row left every chain's ledger map empty and the
        // dashboard loading forever.
        return accountService.isAccountSchemeMatchChain(accountId, chain);
      });

      return { chain, chainId: chain.chainId, accountIds };
    });
  },
);

// --- Requestable chains (connected api + at least one account) ---

type ChainRequest = ChainAccounts & {
  api: ApiPromise;
  /** Relay-chain api - era timing and the authored-blocks probe live there. */
  timelineApi: ApiPromise;
};

const $chainRequests = combine(
  { chainAccounts: $chainAccounts, apis: networkModel.$apis },
  ({ chainAccounts, apis }): ChainRequest[] => {
    const requests: ChainRequest[] = [];

    for (const entry of chainAccounts) {
      const api = apis[entry.chainId];
      if (nullable(api) || entry.accountIds.length === 0) continue;

      const parentApi = entry.chain.parentId ? apis[entry.chain.parentId] : null;

      requests.push({ ...entry, api, timelineApi: parentApi ?? api });
    }

    return requests;
  },
);

// --- (chain, accounts) driven resources ---

const $stakingRequests = $chainRequests.map(requests =>
  requests.map(({ chainId, api, accountIds }) => ({ chainId, api, accounts: accountIds })),
);

const $nominationsRequests = $chainRequests.map(requests =>
  requests.map(({ chainId, api, accountIds }) => ({ chainId, api, stashes: accountIds })),
);

const $chainOnlyRequests = $chainRequests.map(requests => requests.map(({ chainId, api }) => ({ chainId, api })));

bindResourcePool(stakingResource, $stakingRequests);
bindResourcePool(nominationsResource, $nominationsRequests);
// Same request shape as nominations: every account that can hold a ledger on
// the chain is asked whether it registered as a validator. The prefs map is
// keyed by the queried account, mirroring the nominations wiring - on-chain
// both maps are keyed by stash.
bindResourcePool(validatorPrefsResource, $nominationsRequests);
bindResourcePool(minBondResource, $chainOnlyRequests);
bindResourcePool(eraResource, $chainOnlyRequests);

// --- Active era per chain ---

const $eras = combine($chainAccounts, eraResource.$cache, (chainAccounts, cache) => {
  const eras: Record<ChainId, EraIndex> = {};

  for (const { chainId } of chainAccounts) {
    const era = cache[chainId];
    if (nonNullable(era)) {
      eras[chainId] = era;
    }
  }

  return eras;
});

// --- (chain, era) driven resources ---
//
// The era is part of every key below, so a new era yields a new key and the
// pool binding stops the previous one - no leaked refcount across eras.

type EraChainRequest = ChainRequest & { era: EraIndex };

const $eraChainRequests = combine($chainRequests, $eras, (requests, eras): EraChainRequest[] =>
  requests.flatMap(request => {
    const era = eras[request.chainId];

    return nonNullable(era) ? [{ ...request, era }] : [];
  }),
);

const $exposuresRequests = $eraChainRequests.map(requests =>
  requests.map(({ chainId, api, era }) => ({ chainId, api, era })),
);

const $validatorsRequests = $eraChainRequests.map(requests =>
  requests.map(({ chainId, api, era, timelineApi }) => ({ chainId, api, era, timelineApi })),
);

const $eraProgressRequests = $eraChainRequests.map(requests =>
  requests.map(({ chainId, api, era, timelineApi, chain }) => ({ chainId, api, era, timelineApi, chain })),
);

bindResourcePool(exposuresResource, $exposuresRequests);
bindResourcePool(validatorsResource, $validatorsRequests);
bindResourcePool(eraProgressResource, $eraProgressRequests);

// --- Nominated validators per chain ---
//
// Exposure pages are read for the union of what the chain's accounts nominate.
// The union is kept in its own store behind a content check: the nominations
// cache is a live subscription and re-emits on every block, and a fresh array
// on each tick would otherwise churn the pooled exposure-pages subscription.

const $nominatedValidatorsSource = combine(
  $chainAccounts,
  nominationsResource.$cache,
  (chainAccounts, cache): Record<ChainId, AccountId[]> => {
    const result: Record<ChainId, AccountId[]> = {};

    for (const { chainId, accountIds } of chainAccounts) {
      const chainNominations = cache[chainId];
      if (nullable(chainNominations)) continue;

      const union = new Set<AccountId>();
      for (const accountId of accountIds) {
        for (const target of chainNominations[accountId]?.targets ?? []) {
          union.add(target);
        }
      }

      if (union.size > 0) {
        result[chainId] = [...union].sort();
      }
    }

    return result;
  },
);

function isSameValidatorMap(a: Record<ChainId, AccountId[]>, b: Record<ChainId, AccountId[]>): boolean {
  const entries = Object.entries(a);
  const other = new Map(Object.entries(b));

  if (entries.length !== other.size) return false;

  return entries.every(([chainId, left]) => {
    const right = other.get(chainId);

    return nonNullable(right) && left.length === right.length && left.every((value, index) => value === right[index]);
  });
}

const $nominatedValidators = createStore<Record<ChainId, AccountId[]>>({});

sample({
  clock: $nominatedValidatorsSource,
  source: $nominatedValidators,
  filter: (current, next) => !isSameValidatorMap(current, next),
  fn: (_, next) => next,
  target: $nominatedValidators,
});

const $exposurePagesRequests = combine($eraChainRequests, $nominatedValidators, (requests, nominated) =>
  requests.flatMap(({ chainId, api, era }) => {
    const validators = nominated[chainId];

    return nonNullable(validators) && validators.length > 0 ? [{ chainId, api, era, validators }] : [];
  }),
);

bindResourcePool(exposurePagesResource, $exposurePagesRequests);

// --- Positions ---

const EMPTY_VALIDATORS: AccountId[] = [];

const $positions = combine(
  {
    chainAccounts: $chainAccounts,
    ledgers: stakingResource.$cache,
    nominations: nominationsResource.$cache,
    validatorPrefs: validatorPrefsResource.$cache,
    exposurePages: exposurePagesResource.$cache,
    validators: validatorsResource.$cache,
    eras: $eras,
    eraProgress: eraProgressResource.$cache,
    nominated: $nominatedValidators,
  },
  ({
    chainAccounts,
    ledgers,
    nominations,
    validatorPrefs,
    exposurePages,
    validators,
    eras,
    eraProgress,
    nominated,
  }) => {
    const inputs: DerivePositionInput[] = [];

    for (const { chainId, accountIds } of chainAccounts) {
      const activeEra = eras[chainId];
      if (nullable(activeEra)) continue;

      const chainLedgers = ledgers[chainId];
      if (nullable(chainLedgers)) continue;

      const chainNominations = nominations[chainId] ?? {};
      const chainValidators = validators[chainId] ?? null;
      const pagesKey = exposurePagesCacheKey(chainId, activeEra, nominated[chainId] ?? EMPTY_VALIDATORS);
      // `null`, not `{}`. The pages land well after the ledgers, and an empty
      // map reads as "no validator backs this stash" — every nominating
      // position showed a red `inactive` pill for the seconds in between, then
      // flipped to active. Absence of an answer is not an answer.
      const chainExposures = exposurePages[pagesKey] ?? null;

      const progress = eraProgress[chainId];
      const eraAnchor: EraAnchor | null =
        nonNullable(progress) && progress.era === activeEra
          ? { eraStartMs: progress.eraStartMs, eraDurationMs: progress.eraDurationMs }
          : null;

      for (const accountId of accountIds) {
        const stake = chainLedgers[accountId];
        if (nullable(stake)) continue;

        inputs.push({
          accountId,
          chainId,
          stake,
          nomination: chainNominations[accountId] ?? null,
          validatorPrefs: validatorPrefs[chainId]?.[accountId] ?? null,
          exposures: chainExposures,
          validators: chainValidators,
          activeEra,
          eraAnchor,
        });
      }
    }

    return positionsService.derivePositions(inputs);
  },
);

// --- Summary ---
//
// The maths lives in `lib/summary` as a pure function: the KPI row summarizes a
// *subset* of these positions (its own account picker), and both must answer
// with the same rules.

const $summary = $positions.map(summarizePositions);

// --- Minimum nominator bond ---

const $minNominatorBond = combine($stakingChains, minBondResource.$cache, (chains, cache) => {
  const result: Record<ChainId, string> = {};

  for (const { chainId } of chains) {
    const minBond = cache[chainId];
    if (nonNullable(minBond)) {
      result[chainId] = minBond;
    }
  }

  return result;
});

// --- Pending ---
//
// A chain resolves as soon as its ledger map has landed - the ledger
// subscription writes an entry for every requested account, `undefined`
// included, so "no positions here" is an answer, not an unfinished load.

const $pending = combine(
  {
    chainAccounts: $chainAccounts,
    ledgers: stakingResource.$cache,
    nominations: nominationsResource.$cache,
    validatorPrefs: validatorPrefsResource.$cache,
    eras: $eras,
    connections: networkModel.$connections,
    statuses: networkModel.$connectionStatuses,
  },
  ({ chainAccounts, ledgers, nominations, validatorPrefs, eras, connections, statuses }) => {
    return chainAccounts.some(({ chainId, accountIds }) => {
      if (accountIds.length === 0) return false;

      // A chain that will never answer must not hold the whole dashboard.
      const connection = connections[chainId];
      if (nonNullable(connection) && networkUtils.isDisabledConnection(connection)) return false;

      const status = statuses[chainId];
      if (nonNullable(status) && networkUtils.isErrorStatus(status)) return false;

      if (nullable(eras[chainId])) return true;

      const chainLedgers = ledgers[chainId];
      if (nullable(chainLedgers)) return true;

      // The cache is chain-keyed and outlives the subscription key, so "a map
      // exists" is not "this map answers for the accounts being asked about".
      // Without the coverage check a selection change - a newly ticked
      // account, or an address-book row - reads the previous set's map as a
      // finished answer and renders the empty state instead of a skeleton.
      if (accountIds.some(accountId => !(accountId in chainLedgers))) return true;

      const bonded = accountIds.filter(accountId => nonNullable(chainLedgers[accountId]));
      if (bonded.length === 0) return false;

      const chainNominations = nominations[chainId];
      if (nullable(chainNominations)) return true;

      // Same coverage rule as nominations: without the prefs answer a
      // validator position would first render as a bonded nominator and then
      // flip - the skeleton is the honest state.
      const chainPrefs = validatorPrefs[chainId];
      if (nullable(chainPrefs)) return true;

      return bonded.some(accountId => !(accountId in chainNominations) || !(accountId in chainPrefs));
    });
  },
);

export const stakingPositions = {
  $stakingChains,
  $chainAccounts,
  $nominatedValidators,
  $selectedAccountIds,

  $positions,
  $summary,
  $minNominatorBond,
  $pending,

  selectAccountIds,
  retainSelection,
  releaseSelection,
  reset,
};

export type { ChainAccounts };
