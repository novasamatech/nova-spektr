import { default as BigNumber } from 'bignumber.js';

import { type ChainId, type EraIndex } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type UnclaimedPayout } from '@/domains/staking';
import { type ChainEraReward } from '../hooks/useValidatorRewards';

import { type ClaimRow } from './types';

/**
 * One validator, and everything the selection has riding on it.
 *
 * The validator is the unit because the chain says so: a payout is
 * `payout_stakers_by_page(validator, era, page)`, it is permissionless, and it
 * pays **every** nominator in that page at once. Two of our accounts behind the
 * same validator in the same era are therefore one call, not two — a row keeps
 * them together so the claim cannot be submitted twice.
 */
export type ValidatorRewardRow = {
  /** `chainId:validator`. */
  key: string;
  chainId: ChainId;
  chainName: string;
  validatorId: AccountId;
  symbol: string;
  precision: number;
  /** Our accounts standing behind it, in the order the positions came in. */
  nominators: AccountId[];
  /** The validator is one of the selection's own accounts — our validator. */
  isSelf: boolean;
  /** Planck the eras in the window credited to the selection. */
  accrued: string;
  /** Planck still unclaimed, deduped across our accounts. */
  unclaimed: string;
  unclaimedFiat: string;
  /** The distinct eras behind `unclaimed`. */
  eras: EraIndex[];
  /** Deduped `(era, page)` claims — exactly the calls a claim would submit. */
  payouts: UnclaimedPayout[];
};

type Params = {
  /** Per (chain, account) claim data — the source of unclaimed payouts. */
  claimRows: ClaimRow[];
  /** Attributed rewards over the selected window. */
  rewards: ChainEraReward[];
  toFiat: (chainId: ChainId, planck: string) => string;
};

function payoutKey(era: EraIndex, page: number): string {
  return `${era}-${page}`;
}

/**
 * Rows per (chain, validator), largest unclaimed first, then largest accrued.
 *
 * Unclaimed leads the sort because it is the only column the user can act on; a
 * validator that paid well but owes nothing is not what the screen is for.
 */
export function buildValidatorRewardRows({ claimRows, rewards, toFiat }: Params): ValidatorRewardRow[] {
  const byValidator = new Map<string, ValidatorRewardRow>();
  const claimedPages = new Map<string, Set<string>>();
  const chainMeta = new Map<ChainId, { chainName: string; symbol: string; precision: number }>();

  for (const row of claimRows) {
    chainMeta.set(row.chainId, { chainName: row.chainName, symbol: row.symbol, precision: row.precision });
  }

  const ownAccounts = new Set<AccountId>(claimRows.map((row) => row.accountId));

  const ensureRow = (chainId: ChainId, validatorId: AccountId): ValidatorRewardRow | null => {
    const meta = chainMeta.get(chainId);
    if (!meta) return null;

    const key = `${chainId}:${validatorId}`;
    let row = byValidator.get(key);
    if (!row) {
      row = {
        key,
        chainId,
        chainName: meta.chainName,
        validatorId,
        symbol: meta.symbol,
        precision: meta.precision,
        nominators: [],
        isSelf: ownAccounts.has(validatorId),
        accrued: '0',
        unclaimed: '0',
        unclaimedFiat: '0',
        eras: [],
        payouts: [],
      };
      byValidator.set(key, row);
      claimedPages.set(key, new Set());
    }

    return row;
  };

  // Unclaimed first: it decides which rows can be acted on.
  for (const claimRow of claimRows) {
    for (const payout of claimRow.payouts) {
      const row = ensureRow(claimRow.chainId, payout.validator);
      if (!row) continue;

      if (!row.nominators.includes(claimRow.accountId)) {
        row.nominators.push(claimRow.accountId);
      }

      // The amount is ours and adds up across accounts; the call does not — one
      // `(era, page)` pays everyone in it, so it is submitted once.
      row.unclaimed = new BigNumber(row.unclaimed).plus(payout.amount).toFixed();

      const pages = claimedPages.get(row.key)!;
      const key = payoutKey(payout.era, payout.page);
      if (pages.has(key)) continue;

      pages.add(key);
      row.payouts.push(payout);
      if (!row.eras.includes(payout.era)) {
        row.eras.push(payout.era);
      }
    }
  }

  for (const reward of rewards) {
    const row = ensureRow(reward.chainId, reward.validator);
    if (!row) continue;

    row.accrued = new BigNumber(row.accrued).plus(reward.amount).toFixed();
    if (!row.nominators.includes(reward.accountId)) {
      row.nominators.push(reward.accountId);
    }
  }

  const rows = [...byValidator.values()];
  for (const row of rows) {
    row.unclaimedFiat = toFiat(row.chainId, row.unclaimed);
    row.eras.sort((a, b) => a - b);
  }

  return rows.sort(
    (a, b) => new BigNumber(b.unclaimed).comparedTo(a.unclaimed) || new BigNumber(b.accrued).comparedTo(a.accrued) || 0,
  );
}

/**
 * A row can be claimed when something is outstanding on a chain we can sign on.
 *
 * Not "on a chain whose nominator we hold": a payout is permissionless and
 * names the validator, so any account of ours on that chain can submit it and
 * the reward still reaches the nominator's own payee. Rewards of an
 * address-book position are therefore claimable — by us, for them.
 */
export function isRowClaimable(row: ValidatorRewardRow, signableChains: ReadonlySet<ChainId>): boolean {
  return row.payouts.length > 0 && signableChains.has(row.chainId);
}

export type ValidatorClaimRequest = {
  chainId: ChainId;
  /** Whose rewards these are, most-preferred payer first. */
  nominators: AccountId[];
  payouts: UnclaimedPayout[];
};

/**
 * The claim requests a set of validator rows turns into — one per chain.
 *
 * Grouped by chain because the flow signs one network per session, and deduped
 * inside the row already, so the same `(validator, era, page)` never leaves
 * twice. The nominators ride along as a _preference_ for who pays: the host
 * picks one of ours when it can, and any signable account of ours when it
 * cannot.
 */
export function toClaimRequests(
  rows: ValidatorRewardRow[],
  signableChains: ReadonlySet<ChainId>,
): ValidatorClaimRequest[] {
  const byChain = new Map<ChainId, ValidatorClaimRequest>();

  for (const row of rows) {
    if (!isRowClaimable(row, signableChains)) continue;

    const request = byChain.get(row.chainId);
    if (request) {
      request.payouts.push(...row.payouts);
      for (const nominator of row.nominators) {
        if (!request.nominators.includes(nominator)) request.nominators.push(nominator);
      }
    } else {
      byChain.set(row.chainId, {
        chainId: row.chainId,
        nominators: [...row.nominators],
        payouts: [...row.payouts],
      });
    }
  }

  return [...byChain.values()];
}
