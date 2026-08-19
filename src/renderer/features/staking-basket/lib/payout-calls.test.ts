import { describe, expect, it } from 'vitest';

import { type ChainId, type Transaction, TransactionType } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';

import { collectPayoutCalls, summarizePayouts } from './payout-calls';

const CHAIN = '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3' as ChainId;
const STASH = '0x01' as AccountId;

const payout = (era: number, validatorStash: string, page = 0): Transaction => ({
  chainId: CHAIN,
  accountId: STASH,
  type: TransactionType.PAYOUT_STAKERS_BY_PAGE,
  args: { validatorStash, era, page },
});

const batch = (transactions: Transaction[]): Transaction => ({
  chainId: CHAIN,
  accountId: STASH,
  type: TransactionType.BATCH_ALL,
  args: { transactions },
});

describe('collectPayoutCalls', () => {
  it('returns a single payout as itself', () => {
    const single = payout(100, '0xaa');

    expect(collectPayoutCalls(single)).toEqual([single]);
  });

  it('unwraps a batched claim into every payout it carries', () => {
    const calls = [payout(100, '0xaa'), payout(101, '0xbb')];

    expect(collectPayoutCalls(batch(calls))).toEqual(calls);
  });

  it('ignores non-payout calls inside a batch', () => {
    const claim = payout(100, '0xaa');
    const other: Transaction = { chainId: CHAIN, accountId: STASH, type: TransactionType.CHILL, args: {} };

    expect(collectPayoutCalls(batch([claim, other]))).toEqual([claim]);
  });

  it('reports nothing for a transaction that is not a claim at all', () => {
    expect(collectPayoutCalls({ chainId: CHAIN, accountId: STASH, type: TransactionType.CHILL, args: {} })).toEqual([]);
  });
});

describe('summarizePayouts', () => {
  it('counts eras and validators distinctly, not per payout', () => {
    // Two pages of one validator in one era, plus a second validator in it.
    const payouts = [payout(100, '0xaa', 0), payout(100, '0xaa', 1), payout(100, '0xbb')];

    expect(summarizePayouts(payouts)).toEqual({ payoutCount: 3, eraCount: 1, validatorCount: 2 });
  });

  it('reports zeroes for an empty claim rather than throwing', () => {
    expect(summarizePayouts([])).toEqual({ payoutCount: 0, eraCount: 0, validatorCount: 0 });
  });
});
