import { default as BigNumber } from 'bignumber.js';

import { type ChainId } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import {
  type EraValidatorMap,
  type ExposureMap,
  type NominationStatus,
  type StakingPosition,
  positionsService,
} from '@/domains/staking';

/**
 * One nomination of one account, and what the active era did with it.
 *
 * Nominating is not the same as backing: a nomination list of sixteen is a
 * request, and the election answers it by putting stake behind a few of them.
 * This row carries both halves — the request (`validatorId`) and the answer
 * (`status`, `allocated`) — so the spread can show the stake that works, the
 * stake that was dropped and the stake that was never elected in one list.
 */
export type SpreadRow = {
  /** `chainId:accountId:validatorId` — unique across chains. */
  key: string;
  accountId: AccountId;
  chainId: ChainId;
  chainName: string;
  validatorId: AccountId;
  symbol: string;
  precision: number;
  status: NominationStatus;
  /**
   * Planck this account has behind this validator.
   *
   * `'0'` is a fact — the era put nothing here. `null` is the absence of one:
   * the validator backs us according to the position, but its exposure page has
   * not been read, so the amount is unknown rather than zero.
   */
  allocated: string | null;
  /** Planck the account has bonded in total, for context in the same row. */
  positionTotal: string;
};

/** A row the era actually pays — what an allocation export may carry. */
export type AllocationRow = SpreadRow & { status: 'active'; allocated: string };

export type SpreadCounts = {
  total: number;
  active: number;
  waiting: number;
  droppedOut: number;
  /** Distinct accounts represented — the "how many nominators" half. */
  accounts: number;
};

type ChainMeta = { chainName: string; symbol: string; precision: number };

type Params = {
  positions: StakingPosition[];
  /** Era exposure pages per chain, keyed by validator. */
  exposuresByChain: Record<ChainId, ExposureMap>;
  /** Elected validators per chain; a missing chain means "not known yet". */
  eraValidatorsByChain: Record<ChainId, EraValidatorMap>;
  metaByChain: Record<ChainId, ChainMeta>;
};

/** Active first, then the stake that was dropped, then what was never elected. */
const STATUS_RANK: Record<NominationStatus, number> = { active: 0, droppedOut: 1, waiting: 2 };

function comparePlanck(a: string | null, b: string | null): number {
  return new BigNumber(b ?? '0').comparedTo(a ?? '0') ?? 0;
}

/**
 * One row per (account, validator) pair the selection nominates.
 *
 * A chain whose exposure pages have not been read contributes nothing at all
 * rather than a list of rows that all read "not backed" — an unread page is not
 * an answer, and the difference matters both on screen and in an export.
 *
 * Accounts come out grouped, largest position first, and each account's own
 * nominations are ordered by what the era did with them.
 */
export function buildSpreadRows({
  positions,
  exposuresByChain,
  eraValidatorsByChain,
  metaByChain,
}: Params): SpreadRow[] {
  const ordered = [...positions].sort((a, b) => comparePlanck(a.stake.total, b.stake.total));
  const rows: SpreadRow[] = [];

  for (const position of ordered) {
    const exposures = exposuresByChain[position.chainId];
    const meta = metaByChain[position.chainId];
    if (!exposures || !meta) continue;

    const eraValidators = eraValidatorsByChain[position.chainId] ?? null;
    const active = new Set(position.activeValidators);
    const positionRows: SpreadRow[] = [];

    for (const validatorId of position.nominations) {
      // The ledger's stash is what an exposure page names, not the account the
      // position is filed under — they coincide today, but the chain's answer
      // is the one to look up by.
      const individual = exposures[validatorId]?.others.find((entry) => entry.who === position.stake.stash);
      const status = positionsService.resolveNominationStatus(validatorId, active, eraValidators);

      positionRows.push({
        key: `${position.chainId}:${position.accountId}:${validatorId}`,
        accountId: position.accountId,
        chainId: position.chainId,
        chainName: meta.chainName,
        validatorId,
        symbol: meta.symbol,
        precision: meta.precision,
        status,
        allocated: individual ? individual.value : status === 'active' ? null : '0',
        positionTotal: position.stake.total,
      });
    }

    positionRows.sort(
      (a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || comparePlanck(a.allocated, b.allocated),
    );
    rows.push(...positionRows);
  }

  return rows;
}

/**
 * The rows an allocation export may carry: those the era pays, with an amount
 * that was actually read. An active nomination whose page is still unread is
 * left out — a spreadsheet cannot tell an unknown from a zero once written.
 */
export function toAllocationRows(rows: SpreadRow[]): AllocationRow[] {
  return rows.filter((row): row is AllocationRow => row.status === 'active' && row.allocated !== null);
}

export function countSpread(rows: SpreadRow[]): SpreadCounts {
  const counts: SpreadCounts = { total: rows.length, active: 0, waiting: 0, droppedOut: 0, accounts: 0 };
  const accounts = new Set<AccountId>();

  for (const row of rows) {
    accounts.add(row.accountId);
    if (row.status === 'active') counts.active += 1;
    else if (row.status === 'waiting') counts.waiting += 1;
    else counts.droppedOut += 1;
  }

  counts.accounts = accounts.size;

  return counts;
}

export type ValidatorSlice = {
  /** `chainId:validatorId`. */
  key: string;
  chainId: ChainId;
  validatorId: AccountId;
  chainName: string;
  symbol: string;
  precision: number;
  /** Planck the selection has behind this validator, summed over its accounts. */
  allocated: string;
  fiat: string;
  accountCount: number;
};

export type SpreadDistribution = {
  /** Largest first — concentration is what the chart exists to show. */
  slices: ValidatorSlice[];
  /** Bonded stake sitting behind no validator at all, in fiat. */
  idleFiat: string;
  /** Everything the chart accounts for, idle included. */
  totalFiat: string;
};

type DistributionParams = {
  rows: SpreadRow[];
  positions: StakingPosition[];
  toFiat: (chainId: ChainId, planck: string) => string;
};

/**
 * Where the selection's stake actually sits, in one comparable unit.
 *
 * Fiat, not planck: a chart mixing DOT and KSM slices by their raw amounts
 * would rank them by decimals rather than by value.
 *
 * The idle share is the stake that is bonded but backs nobody — a position the
 * election passed over contributes all of it. Positions whose allocation is
 * still unknown are left out of the figure entirely, so it never guesses.
 */
export function buildDistribution({ rows, positions, toFiat }: DistributionParams): SpreadDistribution {
  const byValidator = new Map<string, ValidatorSlice & { accounts: Set<AccountId> }>();
  const allocatedByPosition = new Map<string, BigNumber>();
  const unknownPositions = new Set<string>();

  for (const row of rows) {
    const positionKey = `${row.chainId}:${row.accountId}`;

    if (row.allocated === null) {
      unknownPositions.add(positionKey);
      continue;
    }

    allocatedByPosition.set(
      positionKey,
      (allocatedByPosition.get(positionKey) ?? new BigNumber(0)).plus(row.allocated),
    );

    if (row.status !== 'active') continue;

    const key = `${row.chainId}:${row.validatorId}`;
    const slice = byValidator.get(key);

    if (slice) {
      slice.allocated = new BigNumber(slice.allocated).plus(row.allocated).toFixed();
      slice.accounts.add(row.accountId);
    } else {
      byValidator.set(key, {
        key,
        chainId: row.chainId,
        validatorId: row.validatorId,
        chainName: row.chainName,
        symbol: row.symbol,
        precision: row.precision,
        allocated: row.allocated,
        fiat: '0',
        accountCount: 0,
        accounts: new Set([row.accountId]),
      });
    }
  }

  const slices: ValidatorSlice[] = [];
  for (const { accounts, ...slice } of byValidator.values()) {
    slices.push({ ...slice, accountCount: accounts.size, fiat: toFiat(slice.chainId, slice.allocated) });
  }
  slices.sort((a, b) => new BigNumber(b.fiat).comparedTo(a.fiat) ?? 0);

  // A chain absent from the rows is a chain whose exposures were never read, so
  // nothing may be concluded about its positions. A position on a *known* chain
  // that produced no rows nominates nobody — all of its bond is idle.
  const knownChains = new Set(rows.map((row) => row.chainId));

  let idle = new BigNumber(0);
  for (const position of positions) {
    const positionKey = `${position.chainId}:${position.accountId}`;
    if (unknownPositions.has(positionKey) || !knownChains.has(position.chainId)) continue;

    const allocated = allocatedByPosition.get(positionKey) ?? new BigNumber(0);
    const rest = new BigNumber(position.stake.active).minus(allocated);
    if (rest.gt(0)) {
      idle = idle.plus(toFiat(position.chainId, rest.toFixed()));
    }
  }

  const totalFiat = slices.reduce((acc, slice) => acc.plus(slice.fiat), idle);

  return { slices, idleFiat: idle.toFixed(), totalFiat: totalFiat.toFixed() };
}
