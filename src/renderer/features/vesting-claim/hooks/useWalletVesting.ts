import { BN, BN_ONE, BN_ZERO } from '@polkadot/util';
import { default as BigNumber } from 'bignumber.js';
import { useUnit } from 'effector-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { type Asset, type Balance, type Chain, type ChainId, ConnectionStatus, ConnectionType } from '@/shared/core';
import { getNativeAsset, getRoundedValue, nonNullable, vestedLockedAmountBN } from '@/shared/lib/utils';
import { type AnyAccount, accountService, block } from '@/domains/network';
import { useAssetsPrices } from '@/domains/price';
import { type VestingChainRequest, type VestingData, vestingClaimService } from '@/domains/vesting';
import { balanceModel } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { currencySelect } from '@/aggregates/currency-select';
import { type ClaimAccountResolution, resolveClaimAccount } from '../lib/resolveClaimAccount';
import { type AccountVestingView, type ScheduleView } from '../types';

import { useVestingSchedules } from './useVestingSchedules';

const DAY_MS = 24 * 60 * 60 * 1000;

// Block counts above this can't be projected to a date (BN#toNumber would throw).
const MAX_SAFE_BLOCKS = new BN(Number.MAX_SAFE_INTEGER);

// Upper bound on how long to keep the skeleton while waiting for every enabled
// chain to finish connecting; a few chains can stay stuck mid-connect forever.
const DISCOVERY_TIMEOUT_MS = 10_000;

export type WalletVestingSummary = {
  totalVestingFiat: BigNumber;
  claimableFiat: BigNumber;
  perDayFiat: BigNumber;
  schedulesCount: number;
  lastUnlockDate: Date | null;
  hasClaim: boolean;
};

export type WalletVesting = {
  accountViews: AccountVestingView[];
  summary: WalletVestingSummary;
  /**
   * Skeleton state — shown until the first schedule surfaces (or we're sure
   * there are none).
   */
  pending: boolean;
  /** Content is already shown, but more chains/accounts are still being fetched. */
  loadingMore: boolean;
};

export const useWalletVesting = (accountIds: string[]): WalletVesting => {
  const chains = useUnit(networkModel.$chains);
  const apis = useUnit(networkModel.$apis);
  const connections = useUnit(networkModel.$connections);
  const connectionStatuses = useUnit(networkModel.$connectionStatuses);
  // Hidden wallets are excluded: the confirm store resolves the initiator's
  // wallet out of the visible list, so an account from a hidden wallet would
  // drop the confirmation on the floor.
  const availableAccounts = useUnit(walletModel.$availableAccounts);
  const balanceMap = useUnit(balanceModel.$balanceMap);
  const currentBlock = useUnit(block.$currentBlock);
  const currency = useUnit(currencySelect.$activeCurrency);
  const pricesParams = useUnit(currencySelect.$currentPricesParams);
  const { data: prices } = useAssetsPrices(pricesParams);

  // Vesting-capable chains with the accounts (scheme-matched) to look up.
  const requests = useMemo<VestingChainRequest[]>(() => {
    const result: VestingChainRequest[] = [];
    for (const chain of Object.values(chains)) {
      const api = apis[chain.chainId];
      if (!api?.tx?.vesting?.vest || !api?.query?.vesting?.vesting) continue;

      const chainAccountIds = accountIds.filter((accountId) =>
        accountService.isAccountSchemeMatchChain(accountId as AnyAccount['accountId'], chain),
      );
      if (chainAccountIds.length === 0) continue;

      result.push({ api, chain, accountIds: chainAccountIds as AnyAccount['accountId'][] });
    }
    return result;
  }, [chains, apis, accountIds]);

  const { data: vestingData, pending } = useVestingSchedules(requests.length > 0 ? requests : null);
  const schedulesMap = vestingData.schedules;

  // A chain's api only lands in `$apis` once its metadata is ready, and that is
  // exactly when its status flips to CONNECTED — so `requests` picks up a vesting
  // chain the instant it is CONNECTED. Chains connect in a staggered pipeline
  // (DISCONNECTED → CONNECTING → CONNECTED/ERROR), which means until every enabled
  // chain has reached a terminal state we can't yet know whether a not-yet-
  // connected chain holds vesting.
  const hasSchedules = Object.keys(schedulesMap).length > 0;
  const lastDataRef = useRef<VestingData>({ schedules: {}, locks: {} });

  // Reset retained data when the selected accounts change, so switching wallets
  // shows a fresh skeleton rather than the previous wallet's schedules while the
  // new fetch settles.
  const requestKey = accountIds.join(',');
  const prevKeyRef = useRef(requestKey);
  if (prevKeyRef.current !== requestKey) {
    prevKeyRef.current = requestKey;
    lastDataRef.current = { schedules: {}, locks: {} };
  }

  // Every enabled chain has finished connecting (CONNECTED) or failed (ERROR) —
  // i.e. discovery of vesting-capable chains is complete. Only then, if no vesting
  // chain surfaced, is the empty state truthful.
  const discoveryComplete = useMemo(() => {
    const enabled = Object.values(connections).filter((c) => c.connectionType !== ConnectionType.DISABLED);
    if (enabled.length === 0) return false;

    return enabled.every((connection) => {
      const status = connectionStatuses[connection.chainId];
      return status === ConnectionStatus.CONNECTED || status === ConnectionStatus.ERROR;
    });
  }, [connections, connectionStatuses]);

  // Backstop: some chains can stay stuck mid-connect (light client, a wedged
  // provider) and never reach a terminal state, which would keep discovery
  // "incomplete" forever. After this window we conclude with whatever surfaced so
  // the skeleton can't hang indefinitely for a wallet that genuinely has no vesting.
  const [discoveryTimedOut, setDiscoveryTimedOut] = useState(false);
  useEffect(() => {
    setDiscoveryTimedOut(false);
    const id = setTimeout(() => setDiscoveryTimedOut(true), DISCOVERY_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [requestKey]);

  // While a refetch is in flight the fresh cache key is briefly a miss (empty
  // map); keep showing the last non-empty result so the content doesn't collapse
  // mid-refresh. Once a fetch settles empty (e.g. everything was claimed) the
  // real empty result wins and the empty state shows.
  if (hasSchedules) lastDataRef.current = vestingData;
  const effectiveData = hasSchedules || !pending ? vestingData : lastDataRef.current;
  const effectiveSchedulesMap = effectiveData.schedules;
  const effectiveLocksMap = effectiveData.locks;
  const hasAnySchedule = Object.keys(effectiveSchedulesMap).length > 0;

  // Everything that could still surface a schedule has resolved when: discovery
  // of vesting-capable chains is done (every enabled chain reached a terminal
  // state, or we hit the backstop timeout) AND the current request set's fetch is
  // no longer pending. Only then is "no vesting" truthful.
  const discoverySettled = discoveryComplete || discoveryTimedOut;
  const fetchSettled = requests.length === 0 || !pending;
  const fullySettled = discoverySettled && fetchSettled;

  // Skeleton until the first schedule surfaces; if none ever does, until we're
  // sure (fullySettled). Once at least one schedule is shown, downgrade to a
  // lighter "loading more" indicator while the remaining chains/accounts settle.
  const showLoader = !hasAnySchedule && !fullySettled;
  const loadingMore = hasAnySchedule && !fullySettled;

  // Vesting schedules are denominated in blocks of the chain's timeline chain
  // (relay chain for migrated Asset Hubs). Fetch each timeline chain's expected
  // block time; the query resource caches it per chain indefinitely.
  const blockTimes = useUnit(block.blockTimeResource.$cache);
  useEffect(() => {
    for (const { chain } of requests) {
      const timelineChainId = chain.additional?.timelineChain ?? chain.chainId;
      const timelineChain = chains[timelineChainId];
      const timelineApi = apis[timelineChainId];
      if (timelineChain && timelineApi) {
        block.blockTimeResource.start({ api: timelineApi, chain: timelineChain });
      }
    }
  }, [requests, chains, apis]);

  const accountsById = useMemo(() => {
    const map = new Map<AnyAccount['accountId'], AnyAccount[]>();
    for (const account of availableAccounts) {
      const existing = map.get(account.accountId);
      if (existing) {
        existing.push(account);
      } else {
        map.set(account.accountId, [account]);
      }
    }

    return map;
  }, [availableAccounts]);

  // Resolved once per (chain, account) pair that holds schedules — `findSignatories`
  // rebuilds the account graph on every call, and the view below recomputes on
  // each new block.
  const claimResolutions = useMemo(() => {
    const map = new Map<string, ClaimAccountResolution>();
    for (const [chainId, perChain] of Object.entries(effectiveSchedulesMap)) {
      const chain = chains[chainId as ChainId];
      if (!chain) continue;

      for (const accountId of Object.keys(perChain)) {
        const candidates = accountsById.get(accountId as AnyAccount['accountId']) ?? [];
        map.set(`${chainId}-${accountId}`, resolveClaimAccount(candidates, chain, availableAccounts));
      }
    }

    return map;
  }, [effectiveSchedulesMap, chains, accountsById, availableAccounts]);

  return useMemo(() => {
    const balanceByKey = new Map<string, Balance>();
    for (const balance of Object.values(balanceMap)) {
      balanceByKey.set(`${balance.accountId}-${balance.chainId}-${balance.assetId}`, balance);
    }

    const accountViews: AccountVestingView[] = [];
    let totalVestingFiat = new BigNumber(0);
    let claimableFiat = new BigNumber(0);
    let perDayFiat = new BigNumber(0);
    let lastUnlockDate: Date | null = null;

    // Count schedules straight from the fetched map so the callout can appear as
    // soon as schedules load, without waiting for block height / balances /
    // prices that the claimable figures below depend on.
    const schedulesCount = Object.values(effectiveSchedulesMap).reduce(
      (total, perChain) => total + Object.values(perChain).reduce((sum, schedules) => sum + schedules.length, 0),
      0,
    );

    const addFiat = (asset: Asset, amount: BN): BigNumber => {
      if (!prices || !currency || !asset.priceId) return new BigNumber(0);
      const priceItem = prices[asset.priceId]?.[currency.coingeckoId];
      if (!priceItem) return new BigNumber(0);
      return new BigNumber(getRoundedValue(amount.toString(), priceItem.price, asset.precision));
    };

    for (const [chainId, perChain] of Object.entries(effectiveSchedulesMap)) {
      const chain: Chain | undefined = chains[chainId as Chain['chainId']];
      if (!chain) continue;

      const asset = getNativeAsset(chain.assets);
      if (!asset) continue;

      const timelineChainId = chain.additional?.timelineChain ?? chain.chainId;
      const blockHeight = currentBlock[timelineChainId];
      if (blockHeight == null) continue;
      const currentBlockBN = new BN(blockHeight);

      // Expected block time of the timeline chain, ms. Null until fetched —
      // then the per-day rate and unlock-date projection are omitted rather
      // than computed from a wrong assumption.
      const blockTimeMs = blockTimes[timelineChainId]?.toNumber() ?? null;
      const blocksPerDay = blockTimeMs != null && blockTimeMs > 0 ? new BN(Math.round(DAY_MS / blockTimeMs)) : null;

      // Projects "in N blocks" to a wall-clock date; null when the block time is
      // unknown, the moment has passed, or the block count is corrupt/absurd.
      const blocksToDate = (blocks: BN): Date | null => {
        if (blockTimeMs == null || !blocks.gtn(0) || blocks.gt(MAX_SAFE_BLOCKS)) return null;

        return new Date(Date.now() + blocks.toNumber() * blockTimeMs);
      };

      for (const [accountId, schedules] of Object.entries(perChain)) {
        const typedAccountId = accountId as AnyAccount['accountId'];
        const balance = balanceByKey.get(`${accountId}-${chainId}-${asset.assetId}`);
        // The live vesting lock fetched alongside the schedules is authoritative
        // (it's read from this chain regardless of the global balance
        // subscription); fall back to the balance store only if it's missing.
        const onchainLock = effectiveLocksMap[chainId as Chain['chainId']]?.[typedAccountId];
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

        // Aggregates (token -> fiat per native asset).
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
        schedulesCount,
        lastUnlockDate,
        hasClaim: claimableFiat.gt(0),
      },
      pending: showLoader,
      loadingMore,
    };
  }, [
    effectiveSchedulesMap,
    effectiveLocksMap,
    chains,
    balanceMap,
    currentBlock,
    blockTimes,
    accountsById,
    claimResolutions,
    prices,
    currency,
    showLoader,
    loadingMore,
  ]);
};
