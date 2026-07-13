import { type ApiPromise } from '@polkadot/api';
import { createStore } from 'effector';

import { type Chain, type ChainId } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { createSubscriptionResource } from '@/shared/query';
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

type CacheState = Record<ChainId, ChainVestingEntry>;

/**
 * Per-chain subscription: `vesting.vesting` and the `VESTING` balance lock are
 * watched together and merged, so the cache entry for a chain always carries a
 * consistent {schedules, locks} pair. Ref-counted and pooled by chain+accounts,
 * so a claim landing on-chain (its lock drops, a fully-vested schedule is
 * pruned) flows straight into any subscribed component — no manual refetch.
 */
export const vestingSchedulesResource = createSubscriptionResource<VestingChainRequest>({
  key: ({ chain, accountIds }) => [chain.chainId, ...accountIds],
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

    return () => {
      schedulesUnsub.then(unsub => unsub());
      locksUnsub.then(unsub => unsub());
    };
  })
  .cache<CacheState>({
    store: createStore<CacheState>({}),
    map: (state, entry, { chain }) => ({ ...state, [chain.chainId]: entry }),
  })
  .build();
