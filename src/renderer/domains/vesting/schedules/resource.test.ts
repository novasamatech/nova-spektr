import { type ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { allSettled, fork } from 'effector';
import { describe, expect, it, vi } from 'vitest';

import { type Chain, LockTypes } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';

import { vestingSchedulesResource } from './resource';

// Minimal codec-shaped fakes: the parsers only touch `.toBn()` / `.toString()`
// and the `.entries()` / `.unwrapOr()` surface of the `.multi` results.
const bn = (value: number) => ({ toBn: () => new BN(value) });

const scheduleOption = (schedules: { locked: number; perBlock: number; startingBlock: number }[]) => ({
  unwrapOr: () =>
    schedules.map(s => ({ locked: bn(s.locked), perBlock: bn(s.perBlock), startingBlock: bn(s.startingBlock) })),
});

const vestingLock = (amount: number) => ({ id: { toString: () => LockTypes.VESTING }, amount: bn(amount) });

type Cb<T> = (value: T) => void;

/**
 * Fake api whose `vesting.vesting.multi` and `balances.locks.multi` fire the
 * subscriber immediately with the given entries, and re-fire on `emit*`.
 * Returns the api plus spies so the test can drive updates and assert
 * teardown.
 */
const makeApi = (
  scheduleEntries: unknown[],
  lockEntries: unknown[][],
): {
  api: ApiPromise;
  emitSchedules: (entries: unknown[]) => void;
  emitLocks: (entries: unknown[][]) => void;
  unsubSchedules: () => void;
  unsubLocks: () => void;
} => {
  let schedulesCb: Cb<unknown[]> = () => {};
  let locksCb: Cb<unknown[][]> = () => {};
  const unsubSchedules = vi.fn();
  const unsubLocks = vi.fn();

  const api = {
    tx: { vesting: { vest: () => ({}) } },
    query: {
      vesting: {
        vesting: {
          multi: (_ids: AccountId[], cb: Cb<unknown[]>) => {
            schedulesCb = cb;
            cb(scheduleEntries);

            return Promise.resolve(unsubSchedules);
          },
        },
      },
      balances: {
        locks: {
          multi: (_ids: AccountId[], cb: Cb<unknown[][]>) => {
            locksCb = cb;
            cb(lockEntries);

            return Promise.resolve(unsubLocks);
          },
        },
      },
    },
  } as unknown as ApiPromise;

  return {
    api,
    emitSchedules: entries => schedulesCb(entries),
    emitLocks: entries => locksCb(entries),
    unsubSchedules,
    unsubLocks,
  };
};

const ACCOUNT = '0x00'.padEnd(66, '0') as AccountId;
// The resource pools subscriptions by key in a module-global map, so each test
// uses a distinct chainId to get its own isolated subscription.
const makeChain = (chainId: string) => ({ chainId, name: 'Test' }) as unknown as Chain;

describe('vestingSchedulesResource', () => {
  it('merges the schedules and locks subscriptions into one cache entry', async () => {
    const chain = makeChain('0xa1');
    const { api } = makeApi(
      [scheduleOption([{ locked: 1000, perBlock: 10, startingBlock: 100 }])],
      [[vestingLock(600)]],
    );
    const scope = fork();

    await allSettled(vestingSchedulesResource.subscribe, { scope, params: { api, chain, accountIds: [ACCOUNT] } });

    const entry = scope.getState(vestingSchedulesResource.$cache)[chain.chainId];
    expect(entry?.schedules[ACCOUNT]).toHaveLength(1);
    expect(entry?.schedules[ACCOUNT]?.[0]?.locked.toString()).toBe('1000');
    expect(entry?.locks[ACCOUNT]?.toString()).toBe('600');
  });

  it('pushes the new value when the lock drops (a claim landing on-chain)', async () => {
    const chain = makeChain('0xa2');
    const { api, emitLocks } = makeApi(
      [scheduleOption([{ locked: 1000, perBlock: 10, startingBlock: 100 }])],
      [[vestingLock(600)]],
    );
    const scope = fork();

    await allSettled(vestingSchedulesResource.subscribe, { scope, params: { api, chain, accountIds: [ACCOUNT] } });
    // Re-fire the locks subscription with a smaller lock — the callback pushes
    // into the scope bound at subscribe time.
    emitLocks([[vestingLock(200)]]);

    const entry = scope.getState(vestingSchedulesResource.$cache)[chain.chainId];
    expect(entry?.locks[ACCOUNT]?.toString()).toBe('200');
  });

  it('tears down both storage subscriptions on unsubscribe', async () => {
    const chain = makeChain('0xa3');
    const { api, unsubSchedules, unsubLocks } = makeApi(
      [scheduleOption([{ locked: 1000, perBlock: 10, startingBlock: 100 }])],
      [[vestingLock(600)]],
    );
    const scope = fork();
    const params = { api, chain, accountIds: [ACCOUNT] };

    await allSettled(vestingSchedulesResource.subscribe, { scope, params });
    await allSettled(vestingSchedulesResource.unsubscribe, {
      scope,
      params: vestingSchedulesResource.createKey(params),
    });
    // Flush the unsubscribe promises (`Promise.resolve(unsub).then(...)`).
    await Promise.resolve();
    await Promise.resolve();

    expect(unsubSchedules).toHaveBeenCalledTimes(1);
    expect(unsubLocks).toHaveBeenCalledTimes(1);
  });
});
