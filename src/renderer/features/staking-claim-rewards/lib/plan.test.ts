import { describe, expect, it } from 'vitest';

import { type Asset, type Chain, type ChainId, type Wallet } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount } from '@/domains/network';
import { type UnclaimedPayout } from '@/domains/staking';
import { MAX_PAYOUT_CALLS_PER_BATCH } from '@/entities/transaction';
import { type ClaimRequest } from '../types';

import {
  buildClaimPlans,
  chunkPayouts,
  countEras,
  countValidators,
  dedupePayouts,
  groupRequestsByAccount,
  selectClaimableRequests,
  sortPayouts,
  sumPayouts,
  toPayoutArgs,
} from './plan';

const accountId = (n: number): AccountId => `0x${n.toString(16).padStart(64, '0')}` as AccountId;
const chainId = (n: number): ChainId => `0x${n.toString(16).padStart(64, '0')}` as ChainId;

const chain = (n = 1) => ({ chainId: chainId(n), name: `chain-${n}`, assets: [] }) as unknown as Chain;
const asset = () => ({ assetId: 0, symbol: 'DOT', precision: 10 }) as unknown as Asset;
const account = (n: number) => ({ accountId: accountId(n), walletId: n }) as unknown as AnyAccount;
const wallet = (n: number) => ({ id: n, name: `wallet-${n}` }) as unknown as Wallet;

const payout = (era: number, validator: number, page = 0, amount = '1'): UnclaimedPayout => ({
  era,
  validator: accountId(validator),
  page,
  amount,
});

const request = (n: number, payouts: UnclaimedPayout[], chainIndex = 1): ClaimRequest => ({
  chain: chain(chainIndex),
  asset: asset(),
  account: account(n),
  wallet: wallet(n),
  payouts,
});

describe('sortPayouts', () => {
  it('orders by era first — the oldest rewards are the ones closest to expiring', () => {
    const sorted = sortPayouts([payout(9, 2), payout(3, 5), payout(7, 1)]);

    expect(sorted.map((p) => p.era)).toEqual([3, 7, 9]);
  });

  it('breaks era ties by validator, then page', () => {
    const sorted = sortPayouts([payout(5, 2, 1), payout(5, 1, 3), payout(5, 2, 0)]);

    expect(sorted.map((p) => [p.validator, p.page])).toEqual([
      [accountId(1), 3],
      [accountId(2), 0],
      [accountId(2), 1],
    ]);
  });

  it('does not mutate the input', () => {
    const input = [payout(9, 1), payout(3, 1)];
    sortPayouts(input);

    expect(input.map((p) => p.era)).toEqual([9, 3]);
  });
});

describe('dedupePayouts', () => {
  it('drops a repeated (era, validator, page) — the second call would fail as AlreadyClaimed', () => {
    const result = dedupePayouts([payout(5, 1, 0), payout(5, 1, 0), payout(5, 1, 1)]);

    expect(result).toHaveLength(2);
    expect(result.map((p) => p.page)).toEqual([0, 1]);
  });

  it('keeps the same validator and era on different pages', () => {
    expect(dedupePayouts([payout(5, 1, 0), payout(5, 1, 1), payout(5, 1, 2)])).toHaveLength(3);
  });
});

describe('chunkPayouts', () => {
  it('returns nothing for no payouts', () => {
    expect(chunkPayouts([])).toEqual([]);
  });

  it('keeps exactly the cap in a single chunk', () => {
    const payouts = Array.from({ length: MAX_PAYOUT_CALLS_PER_BATCH }, (_, index) => payout(index, 1));
    const chunks = chunkPayouts(payouts);

    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toHaveLength(MAX_PAYOUT_CALLS_PER_BATCH);
  });

  it('splits one over the cap into two, the remainder last', () => {
    const payouts = Array.from({ length: MAX_PAYOUT_CALLS_PER_BATCH + 1 }, (_, index) => payout(index, 1));
    const chunks = chunkPayouts(payouts);

    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toHaveLength(MAX_PAYOUT_CALLS_PER_BATCH);
    expect(chunks[1]).toHaveLength(1);
  });

  it('splits an exact multiple without a trailing empty chunk', () => {
    const payouts = Array.from({ length: MAX_PAYOUT_CALLS_PER_BATCH * 3 }, (_, index) => payout(index, 1));

    expect(chunkPayouts(payouts)).toHaveLength(3);
  });

  it('preserves order across chunk boundaries', () => {
    const payouts = Array.from({ length: MAX_PAYOUT_CALLS_PER_BATCH + 2 }, (_, index) => payout(index, 1));
    const flattened = chunkPayouts(payouts).flat();

    expect(flattened.map((p) => p.era)).toEqual(payouts.map((p) => p.era));
  });
});

describe('sumPayouts', () => {
  it('sums as BN — planck amounts overflow Number', () => {
    // 2^53 + 1 and 2^53 + 1 again: as floats these collapse to the same value
    // and the sum loses its last digit entirely.
    const big = '9007199254740993';
    const total = sumPayouts([payout(1, 1, 0, big), payout(2, 1, 0, big)]);

    expect(total).toBe('18014398509481986');
    // The same sum done in floats loses the last digit.
    expect(String(Number(big) + Number(big))).toBe('18014398509481984');
  });

  it('is zero for no payouts', () => {
    expect(sumPayouts([])).toBe('0');
  });
});

describe('countValidators / countEras', () => {
  const payouts = [payout(5, 1), payout(5, 2), payout(6, 1), payout(7, 1)];

  it('counts unique validators', () => {
    expect(countValidators(payouts)).toBe(2);
  });

  it('counts unique eras', () => {
    expect(countEras(payouts)).toBe(3);
  });
});

describe('groupRequestsByAccount', () => {
  it('merges two requests for the same account into one', () => {
    const grouped = groupRequestsByAccount([request(1, [payout(5, 1)]), request(1, [payout(6, 1)])]);

    expect(grouped).toHaveLength(1);
    expect(grouped[0]!.payouts.map((p) => p.era)).toEqual([5, 6]);
  });

  it('deduplicates across the merged requests', () => {
    const grouped = groupRequestsByAccount([request(1, [payout(5, 1)]), request(1, [payout(5, 1)])]);

    expect(grouped[0]!.payouts).toHaveLength(1);
  });

  it('sorts the merged payouts oldest era first', () => {
    const grouped = groupRequestsByAccount([request(1, [payout(9, 1)]), request(1, [payout(2, 1)])]);

    expect(grouped[0]!.payouts.map((p) => p.era)).toEqual([2, 9]);
  });

  it('keeps distinct accounts apart', () => {
    const grouped = groupRequestsByAccount([request(1, [payout(5, 1)]), request(2, [payout(5, 1)])]);

    expect(grouped).toHaveLength(2);
  });

  it('drops an account with nothing to claim', () => {
    expect(groupRequestsByAccount([request(1, []), request(2, [payout(5, 1)])])).toHaveLength(1);
  });

  it('does not mutate the incoming requests', () => {
    const first = request(1, [payout(5, 1)]);
    groupRequestsByAccount([first, request(1, [payout(6, 1)])]);

    expect(first.payouts).toHaveLength(1);
  });
});

describe('selectClaimableRequests', () => {
  it('keeps the first request chain and hands the rest back', () => {
    const { claimable, skipped } = selectClaimableRequests([
      request(1, [payout(5, 1)], 1),
      request(2, [payout(5, 1)], 2),
      request(3, [payout(5, 1)], 1),
    ]);

    expect(claimable.map((r) => r.account.accountId)).toEqual([accountId(1), accountId(3)]);
    expect(skipped.map((r) => r.account.accountId)).toEqual([accountId(2)]);
  });

  it('is empty for an empty request list', () => {
    expect(selectClaimableRequests([])).toEqual({ claimable: [], skipped: [] });
  });
});

describe('buildClaimPlans', () => {
  it('makes one plan for an account inside the cap', () => {
    const plans = buildClaimPlans([request(1, [payout(5, 1), payout(6, 1)])]);

    expect(plans).toHaveLength(1);
    expect(plans[0]).toMatchObject({ batchIndex: 0, batchCount: 1 });
  });

  it('chunks an account over the cap into several plans', () => {
    const payouts = Array.from({ length: MAX_PAYOUT_CALLS_PER_BATCH * 2 + 1 }, (_, index) => payout(index, 1));
    const plans = buildClaimPlans([request(1, payouts)]);

    expect(plans).toHaveLength(3);
    expect(plans.map((plan) => plan.batchIndex)).toEqual([0, 1, 2]);
    expect(plans.every((plan) => plan.batchCount === 3)).toBe(true);
    expect(plans.every((plan) => plan.payouts.length <= MAX_PAYOUT_CALLS_PER_BATCH)).toBe(true);
  });

  it('covers every payout exactly once', () => {
    const payouts = Array.from({ length: MAX_PAYOUT_CALLS_PER_BATCH + 3 }, (_, index) => payout(index, 1));
    const plans = buildClaimPlans([request(1, payouts)]);

    expect(plans.flatMap((plan) => plan.payouts)).toHaveLength(payouts.length);
    expect(sumPayouts(plans.flatMap((plan) => plan.payouts))).toBe(sumPayouts(payouts));
  });

  it('keeps each account with its own plans', () => {
    const plans = buildClaimPlans([request(1, [payout(5, 1)]), request(2, [payout(5, 1)])]);

    expect(plans.map((plan) => plan.account.accountId)).toEqual([accountId(1), accountId(2)]);
  });
});

describe('toPayoutArgs', () => {
  it('passes the page through verbatim — it is what payout_stakers_by_page needs', () => {
    expect(toPayoutArgs([payout(7, 3, 2)])).toEqual([{ validatorStash: accountId(3), era: 7, page: 2 }]);
  });
});
