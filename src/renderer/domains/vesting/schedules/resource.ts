import { type ApiPromise } from '@polkadot/api';
import { createStore } from 'effector';

import { type Chain } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type ResourceRequestKey, createSubscriptionResource, wrapKeyFactory } from '@/shared/query';
import { type ChainVestingLocks, type ChainVestingSchedules } from '../lib/types';
import { vestingService } from '../lib/vestingService';

/**
 * A single chain's request: its api, the chain, and the (already
 * scheme-filtered) accounts to look up vesting schedules for.
 */
export type VestingChainRequest = {
  api: ApiPromise;
  chain: Chain;
  accountIds: AccountId[];
};

/** One chain's live schedules together with its live vesting locks. */
export type ChainVestingEntry = {
  schedules: ChainVestingSchedules;
  locks: ChainVestingLocks;
};

/**
 * Keyed by chain **and** account set: a different account set is a different
 * request, so it reads as a cache miss (loading) rather than silently serving
 * the previous set's schedules.
 */
type CacheState = Record<ResourceRequestKey, ChainVestingEntry>;

const vestingKey = ({ chain, accountIds }: VestingChainRequest) => [chain.chainId, ...accountIds];
const createVestingKey = wrapKeyFactory(vestingKey);

/**
 * Per-chain subscription: `vesting.vesting` and the `VESTING` balance lock are
 * watched together and merged, so the cache entry for a chain always carries a
 * consistent {schedules, locks} pair. Ref-counted and pooled by chain+accounts,
 * so a claim landing on-chain (its lock drops, a fully-vested schedule is
 * pruned) flows straight into any subscribed component — no manual refetch.
 */
export const vestingSchedulesResource = createSubscriptionResource<VestingChainRequest>({
  key: vestingKey,
})
  .subscribe<ChainVestingEntry>(({ api, accountIds }, callback) => {
    // Runtime gate: only pallet_vesting chains that expose the claim call.
    if (!api.query.vesting?.vesting || !api.tx.vesting?.vest || accountIds.length === 0) {
      callback({ schedules: {}, locks: {} });

      return () => {};
    }

    let schedules: ChainVestingSchedules = {};
    let locks: ChainVestingLocks = {};
    let sawSchedules = false;
    let sawLocks = false;

    // Emit only once both storage reads have delivered their first value, so the
    // {schedules, locks} pair the consumer sees is never half-populated. Balances
    // is a hard dependency of the vesting pallet, so `balances.locks` is always
    // present on a vesting-capable chain.
    const emit = () => {
      if (sawSchedules && sawLocks) {
        callback({ schedules, locks });
      }
    };

    const schedulesUnsub = vestingService.subscribeSchedulesForAccounts(api, accountIds, next => {
      schedules = next;
      sawSchedules = true;
      emit();
    });

    const locksUnsub = vestingService.subscribeVestingLocksForAccounts(api, accountIds, next => {
      locks = next;
      sawLocks = true;
      emit();
    });

    // Hand the pending subscriptions to the framework as a promised unsubscribe —
    // `createSubscriptionResource` awaits it before tearing down. A sync closure
    // that only `.then`s them leaves both promises floating, so a connection
    // dropping mid-subscribe surfaces as an unhandled rejection.
    //
    // Settled rather than `all`: if one storage read fails and the other lands,
    // the survivor still has to be unsubscribed, and it would otherwise leak.
    return Promise.allSettled([schedulesUnsub, locksUnsub]).then(results => {
      const unsubs: (() => void)[] = [];

      for (const result of results) {
        if (result.status === 'fulfilled') {
          unsubs.push(result.value);
        } else {
          console.error('failed to subscribe to vesting schedules', result.reason);
        }
      }

      return () => {
        for (const unsub of unsubs) unsub();
      };
    });
  })
  .cache<CacheState>({
    store: createStore<CacheState>({}),
    map: (state, entry, params) => ({ ...state, [createVestingKey(params)]: entry }),
  })
  .build();
