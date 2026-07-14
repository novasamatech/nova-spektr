import { BN, BN_ZERO } from '@polkadot/util';
import { default as BigNumber } from 'bignumber.js';

import { type Asset, type BalanceMap, type Chain, type ChainId } from '@/shared/core';
import {
  getNativeAsset,
  getRoundedValue,
  getTimelineChainId,
  nonNullable,
  vestedLockedAmountBN,
} from '@/shared/lib/utils';
import { type AccountId, type BlockHeight } from '@/shared/polkadotjs-schemas';
import { type ResourceRequestKey } from '@/shared/query';
import { type AnyAccount } from '@/domains/network';
import { type CurrencyItem, type PriceObject } from '@/domains/price';
import {
  type ChainVestingEntry,
  type VestingChainRequest,
  type VestingData,
  type VestingScheduleInfo,
  vestingClaimService,
  vestingSchedulesResource,
} from '@/domains/vesting';
import { balanceUtils } from '@/entities/balance';
import { type AccountVestingView, type ScheduleView, type VestingSummary, EMPTY_SUMMARY } from '../types';

import { type ClaimAccountResolution, resolveClaimAccount } from './resolveClaimAccount';

const DAY_MS = 24 * 60 * 60 * 1000;

// Block counts above this can't be projected to a date (BN#toNumber would throw).
const MAX_SAFE_BLOCKS = new BN(Number.MAX_SAFE_INTEGER);

/**
 * The schedules and locks of every request whose subscription has reported,
 * merged per chain. Chains that reported nothing are left out — an empty entry
 * means "looked, nothing here" and must not read as an active schedule.
 */
export const collectVestingData = (
  requests: VestingChainRequest[],
  cache: Record<ResourceRequestKey, ChainVestingEntry>,
): VestingData => {
  const schedules: VestingData['schedules'] = {};
  const locks: VestingData['locks'] = {};

  for (const request of requests) {
    const entry = cache[vestingSchedulesResource.createKey(request)];
    if (!entry) continue;

    if (Object.keys(entry.schedules).length > 0) schedules[request.chain.chainId] = entry.schedules;
    if (Object.keys(entry.locks).length > 0) locks[request.chain.chainId] = entry.locks;
  }

  return { schedules, locks };
};

/**
 * Which local account claims for each (chain, key) pair that holds schedules.
 * Kept apart from the view computation because `findSignatories` rebuilds the
 * account graph on every call, while the views below recompute on every block.
 */
export const computeClaimResolutions = (
  data: VestingData,
  chains: Record<ChainId, Chain>,
  availableAccounts: AnyAccount[],
): Map<string, ClaimAccountResolution> => {
  const accountsById = groupAccountsById(availableAccounts);
  const resolutions = new Map<string, ClaimAccountResolution>();

  for (const [chainId, perChain] of Object.entries(data.schedules)) {
    const chain = chains[chainId as ChainId];
    if (!chain) continue;

    for (const accountId of Object.keys(perChain)) {
      const candidates = accountsById.get(accountId as AccountId) ?? [];
      resolutions.set(`${chainId}-${accountId}`, resolveClaimAccount(candidates, chain, availableAccounts));
    }
  }

  return resolutions;
};

const groupAccountsById = (accounts: AnyAccount[]): Map<AccountId, AnyAccount[]> => {
  const map = new Map<AccountId, AnyAccount[]>();
  for (const account of accounts) {
    const existing = map.get(account.accountId);
    if (existing) {
      existing.push(account);
    } else {
      map.set(account.accountId, [account]);
    }
  }

  return map;
};

type VestingSource = {
  data: VestingData;
  chains: Record<ChainId, Chain>;
  balances: BalanceMap;
  currentBlock: Record<ChainId, BlockHeight>;
  blockTimes: Record<ChainId, BN>;
  availableAccounts: AnyAccount[];
  claimResolutions: Map<string, ClaimAccountResolution>;
  prices: PriceObject;
  currency: CurrencyItem | null;
};

/**
 * Turns the raw schedules into the per-account views and the wallet-wide
 * summary. Amounts stay token-denominated; only the summary carries fiat.
 */
export const computeVesting = ({
  data,
  chains,
  balances,
  currentBlock,
  blockTimes,
  availableAccounts,
  claimResolutions,
  prices,
  currency,
}: VestingSource): { accountViews: AccountVestingView[]; summary: VestingSummary } => {
  // Nothing here to compute — and, crucially, nothing to walk the account graph
  // or the global balance map for. This runs on every balance push (about once a
  // second while subscriptions are live) for every user, vesting or not, so the
  // no-schedules case must cost nothing.
  if (Object.keys(data.schedules).length === 0) {
    return { accountViews: [], summary: EMPTY_SUMMARY };
  }

  const accountsById = groupAccountsById(availableAccounts);

  const accountViews: AccountVestingView[] = [];
  let totalVestingFiat = new BigNumber(0);
  let claimableFiat = new BigNumber(0);
  let perDayFiat = new BigNumber(0);
  let lastUnlockDate: Date | null = null;
  let schedulesCount = 0;
  let hasClaim = false;

  const addFiat = (asset: Asset, amount: BN): BigNumber => {
    if (!currency || !asset.priceId) return new BigNumber(0);
    const priceItem = prices[asset.priceId]?.[currency.coingeckoId];
    if (!priceItem) return new BigNumber(0);

    return new BigNumber(getRoundedValue(amount.toString(), priceItem.price, asset.precision));
  };

  for (const [chainId, perChain] of Object.entries(data.schedules)) {
    const chain = chains[chainId as ChainId];
    if (!chain) continue;

    const asset = getNativeAsset(chain.assets);
    if (!asset) continue;

    // Vesting schedules are denominated in blocks of the chain's timeline chain
    // (the relay chain, for migrated Asset Hubs) — so the height *and* the block
    // time below must both be read from that chain, never from `chain` itself.
    //
    // Nothing this chain holds can be stated without that height: what has
    // vested, what is claimable, whether a schedule has even started are all
    // read against it. So the chain is skipped — and `countUnresolvedChains`
    // holds it *unresolved* for as long as the height is missing, so the block
    // stays on its loader instead of announcing a schedule count it can show no
    // rows for.
    const timelineChainId = getTimelineChainId(chain);
    const blockHeight = currentBlock[timelineChainId];
    if (blockHeight == null) continue;
    const currentBlockBN = new BN(blockHeight);

    // Expected block time of the timeline chain, ms. Null until fetched — then
    // the per-day rate and the unlock-date projection are omitted rather than
    // computed from a wrong assumption.
    const blockTimeMs = blockTimes[timelineChainId]?.toNumber() ?? null;
    const blocksPerDay = blockTimeMs != null && blockTimeMs > 0 ? new BN(Math.round(DAY_MS / blockTimeMs)) : null;
    const blockInADay = blocksPerDay ? currentBlockBN.add(blocksPerDay) : null;

    // What a schedule actually releases over the next 24h — see `unlockBetween`.
    const unlockPerDay = (schedule: VestingScheduleInfo): BN | null => {
      return blockInADay ? vestingClaimService.unlockBetween(schedule, currentBlockBN, blockInADay) : null;
    };

    // Projects a block of the timeline chain to a wall-clock date; null when the
    // block time is unknown, the block has passed, or its number is absurd.
    const blockToDate = (block: BN): Date | null => {
      const blocks = block.sub(currentBlockBN);
      if (blockTimeMs == null || !blocks.gtn(0) || blocks.gt(MAX_SAFE_BLOCKS)) return null;

      return new Date(Date.now() + blocks.toNumber() * blockTimeMs);
    };

    for (const [accountId, schedules] of Object.entries(perChain)) {
      const typedAccountId = accountId as AccountId;
      // Looked up by key rather than by re-indexing the balance map: that map
      // holds every account × chain × asset the wallet has, and only the handful
      // of pairs that hold schedules is ever read from it.
      const balance = balances[balanceUtils.constructBalanceId(typedAccountId, chain.chainId, asset.assetId)];
      // The live vesting lock fetched alongside the schedules is authoritative
      // (it's read from this chain regardless of the global balance
      // subscription); fall back to the balance store only if it's missing.
      const onchainLock = data.locks[chainId as ChainId]?.[typedAccountId];
      const lockAmount = onchainLock ?? vestedLockedAmountBN(balance ?? null);

      const vesting = vestingClaimService.computeAccountVesting(schedules, currentBlockBN, lockAmount);
      const claimableShares = vestingClaimService.distributeClaimable(vesting.schedules, vesting.claimable);

      const scheduleViews: ScheduleView[] = vesting.schedules.map((schedule, index) => {
        const stillVesting = !schedule.lockedNow.isZero();

        return {
          ...schedule,
          index: index + 1,
          perDayRate: stillVesting ? unlockPerDay(schedule) : null,
          fullyUnlocksAt: stillVesting ? blockToDate(schedule.endBlock) : null,
          startsAt: schedule.hasStarted ? null : blockToDate(schedule.startingBlock),
          claimableNow: claimableShares[index] ?? BN_ZERO,
        };
      });

      // The account's next 24h is just the sum of its schedules' — a schedule
      // that is done, or that has not started, contributes nothing on its own.
      const perDayRate = blockInADay
        ? scheduleViews.reduce((sum, schedule) => sum.add(schedule.perDayRate ?? BN_ZERO), BN_ZERO)
        : null;

      const key = `${chainId}-${accountId}`;
      // Any candidate renders the same identicon and name; only the claim
      // account carries the wallet the confirmation and signing steps use.
      const resolution = claimResolutions.get(key);
      const claimAccount = resolution?.account ?? null;
      const account = claimAccount ?? accountsById.get(typedAccountId)?.at(0);

      accountViews.push({
        key,
        accountId: typedAccountId,
        account: account ?? null,
        chainId,
        total: vesting.total,
        stillLocked: vesting.stillLocked,
        claimable: vesting.claimable,
        perDayRate,
        endBlock: vesting.endBlock,
        schedules: scheduleViews,
        claimable_signable: nonNullable(claimAccount),
        // `reason` is null on success — only a missing resolution means the key
        // is not ours. `??` here would brand every claimable account as foreign.
        claimBlockReason: resolution ? resolution.reason : 'no-local-account',
      });

      schedulesCount += scheduleViews.length;
      // Read off the token amount, never off `claimableFiat`: an asset with no
      // price feed (a dev chain, a newly listed token, a failed CoinGecko fetch)
      // contributes 0 fiat while still being perfectly claimable, and the rows
      // below would then offer a claim button the callout's badge denies.
      if (vesting.claimable.gtn(0)) hasClaim = true;

      totalVestingFiat = totalVestingFiat.plus(addFiat(asset, lockAmount));
      claimableFiat = claimableFiat.plus(addFiat(asset, vesting.claimable));
      if (perDayRate) perDayFiat = perDayFiat.plus(addFiat(asset, perDayRate));

      const date = vesting.stillLocked.isZero() ? null : blockToDate(vesting.endBlock);
      if (date && (!lastUnlockDate || date > lastUnlockDate)) lastUnlockDate = date;
    }
  }

  accountViews.sort((a, b) => b.stillLocked.cmp(a.stillLocked));

  return {
    accountViews,
    summary: {
      totalVestingFiat,
      claimableFiat,
      perDayFiat,
      // Counted off the rows that were actually built, not off the raw schedules:
      // the callout and the modal are one click apart, and a count the modal has
      // no rows to back is worse than a count that arrives a moment later.
      schedulesCount,
      lastUnlockDate,
      hasClaim,
    },
  };
};

/**
 * A fingerprint of everything the UI actually prints. Two states with the same
 * fingerprint render identically, so the store can drop the update instead of
 * re-rendering the callout and the modals on every block tick and balance
 * refresh.
 */
export const fingerprintViews = (views: AccountVestingView[]): string =>
  views
    .map(view => {
      // `perDayRate` earns its place: as a schedule's start block draws within a
      // day, the amount it releases over the next 24h starts to climb while
      // every other figure here — nothing vested, nothing claimable — sits still.
      const schedules = view.schedules
        .map(s => `${s.locked}:${s.lockedNow}:${s.vestedSoFar}:${s.claimableNow}:${s.perDayRate ?? '-'}`)
        .join(',');

      return [
        view.key,
        view.total,
        view.stillLocked,
        view.claimable,
        view.perDayRate ?? '-',
        view.claimable_signable,
        view.claimBlockReason ?? '-',
        view.account?.id ?? '-',
        schedules,
      ].join('/');
    })
    .join('|');

// The unlock date is printed to the minute once it is close, so it is compared
// to the minute — but no finer. The projection drifts by seconds on every block,
// and re-rendering the dashboard for that would be churn.
const MINUTE_MS = 60 * 1000;

export const fingerprintSummary = (summary: VestingSummary): string =>
  [
    summary.totalVestingFiat.toFixed(2),
    summary.claimableFiat.toFixed(2),
    summary.perDayFiat.toFixed(2),
    summary.schedulesCount,
    summary.lastUnlockDate ? Math.floor(summary.lastUnlockDate.getTime() / MINUTE_MS) : '-',
    summary.hasClaim,
  ].join('/');
