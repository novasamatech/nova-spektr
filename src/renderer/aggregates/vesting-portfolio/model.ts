import { type ApiPromise } from '@polkadot/api';
import { combine, createEffect, createEvent, createStore, merge, sample, scopeBind } from 'effector';
import { debounce } from 'patronum';

import { type Chain, type ChainId } from '@/shared/core';
import { getTimelineChainId, nonNullable } from '@/shared/lib/utils';
import { type BlockHeight } from '@/shared/polkadotjs-schemas';
import { type AnyAccount, block } from '@/domains/network';
import { type VestingChainRequest, vestingSchedulesResource } from '@/domains/vesting';
import { balanceModel } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { currencySelect } from '@/aggregates/currency-select';

import { mergeBlockHeights, pickTimelineHeights, sameHeights } from './lib/blockHeights';
import { buildRequests, countUnresolvedChains } from './lib/requests';
import { isFullyResolved, isLoadingMore, resolveStatus } from './lib/status';
import {
  collectVestingData,
  computeClaimResolutions,
  computeVesting,
  fingerprintSummary,
  fingerprintViews,
} from './lib/views';
import { wireSubscriptions } from './lib/wireSubscriptions';
import { type AccountVestingView, type VestingSummary, EMPTY_SUMMARY } from './types';

/**
 * The accounts of every visible wallet. Hidden wallets are left out: the
 * confirm store resolves the initiator's wallet out of the visible list, so an
 * account from a hidden wallet would drop the confirmation on the floor.
 *
 * `$availableAccounts` republishes a fresh array on any wallet edit — a renamed
 * wallet, a balance-driven refresh — while the accounts behind it rarely move.
 * Nothing below cares about a wallet's name, only about which accounts exist,
 * so returning the previous array whenever the identities are unchanged keeps
 * the store from emitting (effector compares by reference). That spares the
 * whole graph — requests, subscriptions, the settled latch, and the claim
 * resolutions and view math, which rebuild the account graph and re-run the
 * vesting arithmetic — from reacting to a change that cannot alter their
 * result.
 */
const isSameAccountSet = (next: AnyAccount[], prev: AnyAccount[]) =>
  next.length === prev.length &&
  next.every((account, index) => {
    const previous = prev[index];

    return (
      nonNullable(previous) &&
      account.id === previous.id &&
      account.accountId === previous.accountId &&
      account.walletId === previous.walletId
    );
  });

// `updateFilter` rather than a comparison inside `map`: a skipped update keeps
// the previous value *and its reference*, which is what every derived store
// below reads to decide whether it has anything to recompute.
const $availableAccounts = createStore<AnyAccount[]>([], {
  updateFilter: (next, prev) => !isSameAccountSet(next, prev),
}).on(walletModel.$availableAccounts, (_, accounts) => accounts);

/** Every key of every visible wallet. Stable for as long as the account set is. */
const $accountIds = $availableAccounts.map(accounts => [...new Set(accounts.map(account => account.accountId))].sort());

const $requests = combine(
  { chains: networkModel.$chains, apis: networkModel.$apis, accountIds: $accountIds },
  ({ chains, apis, accountIds }) => buildRequests(chains, apis, accountIds),
);

// Subscriptions

/** The block is on screen. Nothing subscribes while it isn't. */
const activated = createEvent();
const deactivated = createEvent();

const $active = createStore(false)
  .on(activated, () => true)
  .on(deactivated, () => false);

const $desiredRequests = combine($active, $requests, (active, requests) => (active ? requests : []));

wireSubscriptions(vestingSchedulesResource, $desiredRequests);

/**
 * The heads the figures are read against.
 *
 * Everything this aggregate prints — what has vested, what is claimable,
 * whether a schedule is still in its cliff, when it starts and when it ends —
 * is a function of the timeline chain's current block. Nothing else moves: the
 * schedules and locks are push subscriptions that only fire when the chain
 * actually changes them.
 *
 * So the head is the thing that has to be live. It used to be read from a
 * background poll that refreshes once a minute — and that a backgrounded window
 * throttles further — which left the block showing a cliff that had ended ten
 * minutes earlier, and no amount of re-fetching the (unchanged) schedules would
 * have corrected it. While the block is on screen we hold a real subscription
 * to each timeline chain's head instead.
 *
 * Several chains commonly share one timeline chain (every migrated Asset Hub
 * points at its relay), so the same head is subscribed to once. `blockResource`
 * is pooled and ref-counted: this costs nothing when the block leaves the
 * screen, and nothing extra when another part of the app already watches the
 * same chain.
 */
const $desiredHeads = combine(
  { requests: $desiredRequests, apis: networkModel.$apis },
  ({ requests, apis }): { api: ApiPromise }[] => {
    const timelineApis = new Map<ChainId, ApiPromise>();

    for (const { chain } of requests) {
      const timelineChainId = getTimelineChainId(chain);
      const api = apis[timelineChainId];
      if (api) {
        timelineApis.set(timelineChainId, api);
      }
    }

    return [...timelineApis.values()].map(api => ({ api }));
  },
);

wireSubscriptions(block.blockResource, $desiredHeads);

const $knownHeights = combine(block.blockResource.$cache, block.$currentBlock, mergeBlockHeights);

/**
 * Only the timeline chains matter here, and only when their height actually
 * moves — see `pickTimelineHeights`. The `updateFilter` is what keeps the
 * once-a-minute poll of every other connected chain from re-running the vesting
 * computation.
 */
const $blockHeights = createStore<Record<ChainId, BlockHeight>>(
  {},
  { updateFilter: (next, prev) => !sameHeights(next, prev) },
);

sample({
  // `activated` as well as the two sources: heights the background poll had
  // already collected before this model was reached emit no update of their own,
  // and the block would open against an empty map until the next tick.
  clock: [$knownHeights, $requests, activated],
  source: { heights: $knownHeights, requests: $requests },
  fn: pickTimelineHeights,
  target: $blockHeights,
});

// The schedules' block counts belong to the chain's timeline chain (the relay
// chain, for migrated Asset Hubs). The query resource caches each block time
// indefinitely, so this is a one-shot per chain.
type BlockTimeSource = {
  requests: VestingChainRequest[];
  chains: Record<ChainId, Chain>;
  apis: Record<ChainId, ApiPromise>;
};

const fetchBlockTimesFx = createEffect(({ requests, chains, apis }: BlockTimeSource) => {
  const start = scopeBind(block.blockTimeResource.start, { safe: true });

  for (const { chain } of requests) {
    const timelineChainId = getTimelineChainId(chain);
    const timelineChain = chains[timelineChainId];
    const timelineApi = apis[timelineChainId];
    if (timelineChain && timelineApi) {
      start({ api: timelineApi, chain: timelineChain });
    }
  }
});

sample({
  clock: $desiredRequests,
  source: { chains: networkModel.$chains, apis: networkModel.$apis },
  filter: (_, requests) => requests.length > 0,
  fn: ({ chains, apis }, requests) => ({ requests, chains, apis }),
  target: fetchBlockTimesFx,
});

// Readiness

/**
 * How long a chain is given to report before we stop counting it as a chain
 * that might still surface vesting.
 *
 * Generous on purpose: the cost of being too eager is a false "no vesting", the
 * very thing this model exists to prevent. The cost of being too patient is
 * only a loader that lingers.
 */
const GRACE_MS = 30_000;

const graceElapsed = debounce({
  // Restarts on a new account set, and on every activation: each is a fresh
  // question, and the chains get their full grace to answer it.
  source: merge([activated, $accountIds]),
  timeout: GRACE_MS,
});

/**
 * The deadline has passed — see `countUnresolvedChains`.
 *
 * `activated` resets it as well as re-arming the debounce above. The timer is
 * not cancelled when the block leaves the screen, so one armed on a previous
 * visit fires while nothing is mounted; without this reset the _next_ visit
 * would open with the grace already spent and give up on every still-connecting
 * chain immediately — a false "no vesting" on the very first frame.
 */
const $graceExpired = createStore(false)
  .on(graceElapsed, () => true)
  .reset([$accountIds, activated, deactivated]);

const $resolution = combine(
  {
    connections: networkModel.$connections,
    statuses: networkModel.$connectionStatuses,
    chains: networkModel.$chains,
    apis: networkModel.$apis,
    accountIds: $accountIds,
    cache: vestingSchedulesResource.$cache,
    blockHeights: $blockHeights,
    graceExpired: $graceExpired,
  },
  countUnresolvedChains,
);

const $fullyResolved = combine(
  { resolution: $resolution, loadingWallets: walletModel.$isLoadingWallets },
  ({ resolution, loadingWallets }) => isFullyResolved({ ...resolution, loadingWallets }),
);

const $data = combine($requests, vestingSchedulesResource.$cache, collectVestingData);

// Views

const $claimResolutions = combine(
  { data: $data, chains: networkModel.$chains, availableAccounts: $availableAccounts },
  ({ data, chains, availableAccounts }) => computeClaimResolutions(data, chains, availableAccounts),
);

const $vesting = combine(
  {
    data: $data,
    chains: networkModel.$chains,
    balances: balanceModel.$balanceMap,
    currentBlock: $blockHeights,
    blockTimes: block.blockTimeResource.$cache,
    availableAccounts: $availableAccounts,
    claimResolutions: $claimResolutions,
    prices: currencySelect.$assetsPrices,
    currency: currencySelect.$activeCurrency,
  },
  computeVesting,
);

/**
 * Balances and block heights update on their own schedules; most of those
 * updates leave every printed figure unchanged. Fingerprinting turns them into
 * no-ops instead of re-renders — which matters most while a claim is being
 * signed, when the sign step must not be disturbed.
 *
 * The fingerprint is kept _alongside_ the value rather than recomputed inside
 * `updateFilter`, which would rebuild the unchanged previous fingerprint on
 * every block tick just to compare it.
 */
type Fingerprinted<T> = { value: T; fingerprint: string };

const fingerprinted = <T>(value: T, fingerprint: (value: T) => string): Fingerprinted<T> => ({
  value,
  fingerprint: fingerprint(value),
});

const $accountViewsState = createStore(fingerprinted<AccountVestingView[]>([], fingerprintViews), {
  updateFilter: (next, prev) => next.fingerprint !== prev.fingerprint,
}).on($vesting, (_, { accountViews }) => fingerprinted(accountViews, fingerprintViews));

const $accountViews = $accountViewsState.map(state => state.value);

const $summaryState = createStore(fingerprinted<VestingSummary>(EMPTY_SUMMARY, fingerprintSummary), {
  updateFilter: (next, prev) => next.fingerprint !== prev.fingerprint,
}).on($vesting, (_, { summary }) => fingerprinted(summary, fingerprintSummary));

const $summary = $summaryState.map(state => state.value);

// Status

/**
 * There is vesting to show.
 *
 * Read off the rendered rows rather than the raw schedules: a chain whose
 * schedules have arrived but whose timeline head has not can produce no rows at
 * all (see `computeVesting`), and calling that "ready" is what let the callout
 * advertise a schedule count the modal could not back. `countUnresolvedChains`
 * keeps such a chain unresolved, so the block waits on its loader — bounded, as
 * ever, by the grace period.
 */
const $hasSchedules = $accountViews.map(views => views.length > 0);

/**
 * A terminal state has been shown for the current account set — see
 * `resolveStatus`.
 */
const $settledOnce = createStore(false);

// Clocked on the two source stores rather than on an inline `combine` of them:
// emission tracking of a derived-store clock is not scope-local under `fork()`,
// and this latch would then misbehave in forked tests.
sample({
  clock: [$hasSchedules, $fullyResolved],
  source: { hasSchedules: $hasSchedules, fullyResolved: $fullyResolved },
  filter: ({ hasSchedules, fullyResolved }) => hasSchedules || fullyResolved,
  fn: () => true,
  target: $settledOnce,
});

// A different account set is a different question — ask it from scratch.
sample({
  clock: $accountIds,
  fn: () => false,
  target: $settledOnce,
});

const $status = combine(
  { hasSchedules: $hasSchedules, fullyResolved: $fullyResolved, settledOnce: $settledOnce },
  resolveStatus,
);

const $loadingMore = combine({ status: $status, fullyResolved: $fullyResolved }, isLoadingMore);

export const vestingPortfolioModel = {
  $status,
  $loadingMore,
  $summary,
  $accountViews,

  activated,
  deactivated,
};
