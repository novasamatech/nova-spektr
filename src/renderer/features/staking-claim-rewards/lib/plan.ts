import { BN, BN_ZERO } from '@polkadot/util';

import { type Address } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type UnclaimedPayout } from '@/domains/staking';
import { MAX_PAYOUT_CALLS_PER_BATCH } from '@/entities/transaction';
import { type ClaimPlan, type ClaimRequest } from '../types';

const payoutKey = ({ era, validator, page }: UnclaimedPayout) => `${era}:${validator}:${page}`;

/**
 * Oldest era first, then validator, then page.
 *
 * The same order `transactionBuilder.buildPayoutStakers` applies inside a batch
 * — applying it before chunking is what makes the chunk boundaries meaningful:
 * the first transaction claims the oldest rewards, which are the ones closest
 * to falling out of `historyDepth` and being lost.
 */
export function sortPayouts(payouts: UnclaimedPayout[]): UnclaimedPayout[] {
  return [...payouts].sort((a, b) => a.era - b.era || a.validator.localeCompare(b.validator) || a.page - b.page);
}

/**
 * Same (era, validator, page) twice is the same on-chain call — the second one
 * would fail with `AlreadyClaimed` and take the whole batch down with it.
 */
export function dedupePayouts(payouts: UnclaimedPayout[]): UnclaimedPayout[] {
  const seen = new Set<string>();
  const result: UnclaimedPayout[] = [];

  for (const payout of payouts) {
    const key = payoutKey(payout);
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(payout);
  }

  return result;
}

/**
 * `transactionBuilder.buildPayoutStakers` throws above the cap by design — the
 * caller decides how to split. Chunks are equal-sized except the last.
 */
export function chunkPayouts(
  payouts: UnclaimedPayout[],
  size: number = MAX_PAYOUT_CALLS_PER_BATCH,
): UnclaimedPayout[][] {
  if (payouts.length === 0) return [];

  const chunks: UnclaimedPayout[][] = [];
  for (let index = 0; index < payouts.length; index += size) {
    chunks.push(payouts.slice(index, index + size));
  }

  return chunks;
}

/** Planck, summed as BN — reward amounts overflow `Number` routinely. */
export function sumPayouts(payouts: UnclaimedPayout[]): string {
  return payouts.reduce((total, payout) => total.add(new BN(payout.amount)), BN_ZERO).toString();
}

export function countValidators(payouts: UnclaimedPayout[]): number {
  return new Set(payouts.map((payout) => payout.validator)).size;
}

export function countEras(payouts: UnclaimedPayout[]): number {
  return new Set(payouts.map((payout) => payout.era)).size;
}

/**
 * One entry per account. The same account can arrive twice — the dashboard
 * builds its request list from positions, and a stash with two positions on the
 * same chain is one signer with one merged set of payouts.
 */
export function groupRequestsByAccount(requests: ClaimRequest[]): ClaimRequest[] {
  const byAccount = new Map<string, ClaimRequest>();

  for (const request of requests) {
    // Keyed by chain as well as account: the same stash nominates on several
    // networks, and merging those would batch one chain's payouts into the
    // other's transaction.
    const key = `${request.chain.chainId}:${request.account.accountId}`;
    const existing = byAccount.get(key);
    if (existing) {
      existing.payouts = existing.payouts.concat(request.payouts);
    } else {
      byAccount.set(key, { ...request, payouts: [...request.payouts] });
    }
  }

  return [...byAccount.values()]
    .map((request) => ({ ...request, payouts: sortPayouts(dedupePayouts(request.payouts)) }))
    .filter((request) => request.payouts.length > 0);
}

/**
 * The flow signs on **one chain at a time**: the fee it quotes, the balance it
 * validates against and the signing route it offers all belong to a single
 * network, and there is no honest way to render a total fee that spans two
 * native tokens. Requests on other chains are handed back to the caller rather
 * than dropped, so the confirm can say they were left out.
 */
export function selectClaimableRequests(requests: ClaimRequest[]): {
  claimable: ClaimRequest[];
  skipped: ClaimRequest[];
} {
  const grouped = groupRequestsByAccount(requests);
  const chainId = grouped.at(0)?.chain.chainId;

  if (!chainId) return { claimable: [], skipped: [] };

  return {
    claimable: grouped.filter((request) => request.chain.chainId === chainId),
    skipped: grouped.filter((request) => request.chain.chainId !== chainId),
  };
}

/**
 * Every transaction the session will sign, in the order it will sign them.
 *
 * Deduplication spans the whole session, not one account:
 * `payout_stakers_by_page` pays **every** nominator on that exposure page, so
 * when two of the user's stashes back the same validator in the same era and
 * land on the same page, one call settles both. Emitting it twice makes the
 * second revert with `AlreadyClaimed` — and since a plan of several payouts is
 * a `BATCH_ALL`, that revert takes every other still-valid payout in the batch
 * down with it. The dropped duplicate is not lost money: it is paid by the call
 * that was kept, which is why `$totalAmount` is summed over the requests rather
 * than the plans.
 */
export function buildClaimPlans(requests: ClaimRequest[]): ClaimPlan[] {
  const claimedByCall = new Set<string>();

  return requests.flatMap((request) => {
    const payouts = request.payouts.filter((payout) => {
      const key = payoutKey(payout);
      if (claimedByCall.has(key)) return false;

      claimedByCall.add(key);

      return true;
    });

    const batches = chunkPayouts(payouts);

    return batches.map((payouts, batchIndex) => ({
      chain: request.chain,
      asset: request.asset,
      account: request.account,
      wallet: request.wallet,
      payouts,
      batchIndex,
      batchCount: batches.length,
    }));
  });
}

/** `UnclaimedPayout` → the shape `transactionBuilder.buildPayoutStakers` takes. */
export function toPayoutArgs(
  payouts: UnclaimedPayout[],
): { validatorStash: Address | AccountId; era: number; page: number }[] {
  return payouts.map(({ validator, era, page }) => ({ validatorStash: validator, era, page }));
}
