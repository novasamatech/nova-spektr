import { type ApiPromise } from '@polkadot/api';
import { combine, createEffect, createEvent, createStore, merge, sample, scopeBind } from 'effector';
import { debounce } from 'patronum';

import { type Chain, type ChainId } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type ResourceRequestKey } from '@/shared/query';
import { block } from '@/domains/network';
import { type VestingChainRequest, vestingSchedulesResource } from '@/domains/vesting';
import { balanceModel } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { currencySelect } from '@/aggregates/currency-select';

import { buildRequests, countUnresolvedChains } from './lib/requests';
import { isFullyResolved, isLoadingMore, resolveStatus } from './lib/status';
import {
  collectVestingData,
  computeClaimResolutions,
  computeVesting,
  fingerprintSummary,
  fingerprintViews,
} from './lib/views';
import { type AccountVestingView, type VestingSummary, EMPTY_SUMMARY } from './types';

/**
 * Every key of every visible wallet. Hidden wallets are left out: the confirm
 * store resolves the initiator's wallet out of the visible list, so an account
 * from a hidden wallet would drop the confirmation on the floor.
 *
 * `$availableAccounts` republishes a fresh array on any wallet edit — a renamed
 * wallet, a balance-driven refresh — while the key set behind it rarely moves.
 * Returning the previous array when the keys are unchanged keeps the store from
 * emitting (effector compares by reference), so the whole graph below —
 * requests, subscriptions, the settled latch — only reacts when the question
 * itself changes.
 */
let lastAccountIds: AccountId[] = [];
const $accountIds = walletModel.$availableAccounts.map(accounts => {
  const ids = [...new Set(accounts.map(account => account.accountId))].sort();
  const unchanged = ids.length === lastAccountIds.length && ids.every((id, index) => id === lastAccountIds[index]);
  if (unchanged) return lastAccountIds;

  lastAccountIds = ids;

  return ids;
});

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

const $subscribedKeys = createStore<ResourceRequestKey[]>([]);

type SubscriptionDiff = {
  added: VestingChainRequest[];
  removed: ResourceRequestKey[];
  next: ResourceRequestKey[];
};

// The resource's subscribe/unsubscribe are events; `scopeBind` keeps them bound
// to the scope this ran in (tests fork a scope, the app does not).
const syncSubscriptionsFx = createEffect(({ added, removed }: SubscriptionDiff) => {
  const subscribe = scopeBind(vestingSchedulesResource.subscribe, { safe: true });
  const unsubscribe = scopeBind(vestingSchedulesResource.unsubscribe, { safe: true });

  for (const request of added) {
    subscribe(request);
  }
  for (const key of removed) {
    unsubscribe(key);
  }
});

sample({
  clock: $desiredRequests,
  source: $subscribedKeys,
  // An unchanged request set must not touch the ref-counted subscriptions — the
  // requests themselves are rebuilt on every chain and wallet update.
  filter: (subscribed, desired) => {
    if (subscribed.length !== desired.length) return true;
    const subscribedSet = new Set(subscribed);

    return desired.some(request => !subscribedSet.has(vestingSchedulesResource.createKey(request)));
  },
  fn: (subscribed, desired): SubscriptionDiff => {
    const next = desired.map(request => vestingSchedulesResource.createKey(request));
    const nextSet = new Set(next);
    const subscribedSet = new Set(subscribed);

    return {
      added: desired.filter(request => !subscribedSet.has(vestingSchedulesResource.createKey(request))),
      removed: subscribed.filter(key => !nextSet.has(key)),
      next,
    };
  },
  target: syncSubscriptionsFx,
});

$subscribedKeys.on(syncSubscriptionsFx, (_, { next }) => next);

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
    const timelineChainId = chain.additional?.timelineChain ?? chain.chainId;
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
 * How long a chain is given to connect before we stop counting it as a chain
 * that might still surface vesting.
 *
 * Generous on purpose: the cost of being too eager is a false "no vesting", the
 * very thing this model exists to prevent. The cost of being too patient is
 * only a loader that lingers. Chains that do connect are never subject to this
 * — they answer in milliseconds — so this bounds one case only: an RPC that is
 * down.
 */
const GRACE_MS = 30_000;

const graceElapsed = debounce({
  // Restarts on a new account set: that is a fresh question, and the chains get
  // their full grace to answer it.
  source: merge([activated, $accountIds]),
  timeout: GRACE_MS,
});

const $graceExpired = createStore(false)
  .on(graceElapsed, () => true)
  .reset([$accountIds, deactivated]);

const $resolution = combine(
  {
    connections: networkModel.$connections,
    statuses: networkModel.$connectionStatuses,
    chains: networkModel.$chains,
    apis: networkModel.$apis,
    accountIds: $accountIds,
    cache: vestingSchedulesResource.$cache,
    graceExpired: $graceExpired,
  },
  countUnresolvedChains,
);

const $fullyResolved = combine(
  { resolution: $resolution, loadingWallets: walletModel.$isLoadingWallets },
  ({ resolution, loadingWallets }) => isFullyResolved({ ...resolution, loadingWallets }),
);

const $data = combine($requests, vestingSchedulesResource.$cache, collectVestingData);

const $hasSchedules = $data.map(data => Object.keys(data.schedules).length > 0);

/**
 * A terminal state has been shown for the current account set — see
 * `resolveStatus`.
 */
const $settledOnce = createStore(false);

sample({
  clock: combine($hasSchedules, $fullyResolved, (hasSchedules, fullyResolved) => hasSchedules || fullyResolved),
  filter: Boolean,
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

// Views

const $claimResolutions = combine(
  { data: $data, chains: networkModel.$chains, availableAccounts: walletModel.$availableAccounts },
  ({ data, chains, availableAccounts }) => computeClaimResolutions(data, chains, availableAccounts),
);

const $vesting = combine(
  {
    data: $data,
    chains: networkModel.$chains,
    balances: balanceModel.$balanceMap,
    currentBlock: block.$currentBlock,
    blockTimes: block.blockTimeResource.$cache,
    availableAccounts: walletModel.$availableAccounts,
    claimResolutions: $claimResolutions,
    prices: currencySelect.$assetsPrices,
    currency: currencySelect.$activeCurrency,
  },
  computeVesting,
);

// Balances and block heights update on their own schedules; most of those
// updates leave every printed figure unchanged. The fingerprints below turn
// those into no-ops instead of re-renders — which matters most while a claim is
// being signed, when the sign step must not be disturbed.
const $accountViews = createStore<AccountVestingView[]>([], {
  updateFilter: (next, prev) => fingerprintViews(next) !== fingerprintViews(prev),
});
$accountViews.on($vesting, (_, { accountViews }) => accountViews);

const $summary = createStore<VestingSummary>(EMPTY_SUMMARY, {
  updateFilter: (next, prev) => fingerprintSummary(next) !== fingerprintSummary(prev),
});
$summary.on($vesting, (_, { summary }) => summary);

export const vestingPortfolioModel = {
  $status,
  $loadingMore,
  $summary,
  $accountViews,

  activated,
  deactivated,
};
