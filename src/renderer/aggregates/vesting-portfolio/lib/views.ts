import { BN, BN_ONE, BN_ZERO } from '@polkadot/util';
import { default as BigNumber } from 'bignumber.js';

import { type Asset, type Balance, type Chain, type ChainId } from '@/shared/core';
import { getNativeAsset, getRoundedValue, nonNullable, vestedLockedAmountBN } from '@/shared/lib/utils';
import { type AccountId, type BlockHeight } from '@/shared/polkadotjs-schemas';
import { type ResourceRequestKey } from '@/shared/query';
import { type AnyAccount } from '@/domains/network';
import { type CurrencyItem, type PriceObject } from '@/domains/price';
import {
  type ChainVestingEntry,
  type VestingChainRequest,
  type VestingData,
  vestingClaimService,
  vestingSchedulesResource,
} from '@/domains/vesting';
import { type AccountVestingView, type ScheduleView, type VestingSummary } from '../types';

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

export const countSchedules = (data: VestingData): number =>
  Object.values(data.schedules).reduce(
    (total, perChain) => total + Object.values(perChain).reduce((sum, schedules) => sum + schedules.length, 0),
    0,
  );

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
  balances: Record<string, Balance>;
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
  const accountsById = groupAccountsById(availableAccounts);

  const balanceByKey = new Map<string, Balance>();
  for (const balance of Object.values(balances)) {
    balanceByKey.set(`${balance.accountId}-${balance.chainId}-${balance.assetId}`, balance);
  }

  const accountViews: AccountVestingView[] = [];
  let totalVestingFiat = new BigNumber(0);
  let claimableFiat = new BigNumber(0);
  let perDayFiat = new BigNumber(0);
  let lastUnlockDate: Date | null = null;

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
    // (the relay chain, for migrated Asset Hubs).
    const timelineChainId = chain.additional?.timelineChain ?? chain.chainId;
    const blockHeight = currentBlock[timelineChainId];
    if (blockHeight == null) continue;
    const currentBlockBN = new BN(blockHeight);

    // Expected block time of the timeline chain, ms. Null until fetched — then
    // the per-day rate and the unlock-date projection are omitted rather than
    // computed from a wrong assumption.
    const blockTimeMs = blockTimes[timelineChainId]?.toNumber() ?? null;
    const blocksPerDay = blockTimeMs != null && blockTimeMs > 0 ? new BN(Math.round(DAY_MS / blockTimeMs)) : null;

    // Projects "in N blocks" to a wall-clock date; null when the block time is
    // unknown, the moment has passed, or the block count is corrupt/absurd.
    const blocksToDate = (blocks: BN): Date | null => {
      if (blockTimeMs == null || !blocks.gtn(0) || blocks.gt(MAX_SAFE_BLOCKS)) return null;

      return new Date(Date.now() + blocks.toNumber() * blockTimeMs);
    };

    for (const [accountId, schedules] of Object.entries(perChain)) {
      const typedAccountId = accountId as AccountId;
      const balance = balanceByKey.get(`${accountId}-${chainId}-${asset.assetId}`);
      // The live vesting lock fetched alongside the schedules is authoritative
      // (it's read from this chain regardless of the global balance
      // subscription); fall back to the balance store only if it's missing.
      const onchainLock = data.locks[chainId as ChainId]?.[typedAccountId];
      const lockAmount = onchainLock ?? vestedLockedAmountBN(balance ?? null);

      const vesting = vestingClaimService.computeAccountVesting(schedules, currentBlockBN, lockAmount);
      const perDayRate = blocksPerDay ? vesting.perBlockRate.mul(blocksPerDay) : null;
      const claimableShares = vestingClaimService.distributeClaimable(vesting.schedules, vesting.claimable);

      const scheduleViews: ScheduleView[] = vesting.schedules.map((schedule, index) => {
        const inCliff = schedule.vestedSoFar.isZero();
        const stillVesting = !schedule.lockedNow.isZero();

        return {
          ...schedule,
          index: index + 1,
          inCliff,
          perDayRate: blocksPerDay && stillVesting ? BN.max(schedule.perBlock, BN_ONE).mul(blocksPerDay) : null,
          fullyUnlocksAt: stillVesting ? blocksToDate(schedule.endBlock.sub(currentBlockBN)) : null,
          cliffEndsAt: inCliff ? blocksToDate(schedule.startingBlock.sub(currentBlockBN)) : null,
          claimableNow: claimableShares[index] ?? BN_ZERO,
        };
      });

      const key = `${chainId}-${accountId}`;
      // Any candidate renders the same identicon and name; only the claim
      // account carries the wallet the confirmation and signing steps use.
      const resolution = claimResolutions.get(key);
      const claimAccount = resolution?.account ?? null;
      const account = claimAccount ?? accountsById.get(typedAccountId)?.at(0);

      accountViews.push({
        key,
        account: account ?? ({ accountId: typedAccountId } as AnyAccount),
        chainId,
        total: vesting.total,
        stillLocked: vesting.stillLocked,
        claimable: vesting.claimable,
        perBlockRate: vesting.perBlockRate,
        perDayRate,
        endBlock: vesting.endBlock,
        schedules: scheduleViews,
        claimable_signable: nonNullable(claimAccount),
        // `reason` is null on success — only a missing resolution means the key
        // is not ours. `??` here would brand every claimable account as foreign.
        claimBlockReason: resolution ? resolution.reason : 'no-local-account',
      });

      totalVestingFiat = totalVestingFiat.plus(addFiat(asset, lockAmount));
      claimableFiat = claimableFiat.plus(addFiat(asset, vesting.claimable));
      if (perDayRate) perDayFiat = perDayFiat.plus(addFiat(asset, perDayRate));

      const blocksToEnd = vesting.endBlock.sub(currentBlockBN);
      if (blocksToEnd.gtn(0) && blockTimeMs != null) {
        const date = new Date(Date.now() + blocksToEnd.toNumber() * blockTimeMs);
        if (!lastUnlockDate || date > lastUnlockDate) lastUnlockDate = date;
      }
    }
  }

  accountViews.sort((a, b) => (b.stillLocked.gt(a.stillLocked) ? 1 : -1));

  return {
    accountViews,
    summary: {
      totalVestingFiat,
      claimableFiat,
      perDayFiat,
      // Counted straight from the fetched schedules, so the callout can appear as
      // soon as they load — without waiting for the block height, balances and
      // prices the figures above depend on.
      schedulesCount: countSchedules(data),
      lastUnlockDate,
      hasClaim: claimableFiat.gt(0),
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
      const schedules = view.schedules
        .map(s => `${s.locked}:${s.lockedNow}:${s.vestedSoFar}:${s.claimableNow}`)
        .join(',');

      return [
        view.key,
        view.total,
        view.stillLocked,
        view.claimable,
        view.perDayRate ?? '-',
        view.claimable_signable,
        view.claimBlockReason ?? '-',
        view.account.id ?? '-',
        schedules,
      ].join('/');
    })
    .join('|');

export const fingerprintSummary = (summary: VestingSummary): string =>
  [
    summary.totalVestingFiat.toFixed(2),
    summary.claimableFiat.toFixed(2),
    summary.perDayFiat.toFixed(2),
    summary.schedulesCount,
    // Only the day is printed — a projection that drifts by seconds each block
    // must not re-render the block.
    summary.lastUnlockDate?.toDateString() ?? '-',
    summary.hasClaim,
  ].join('/');
