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
  const ordered = [...positions].sort((a, b) => comparePlanck(a.stake.active, b.stake.active));
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
        positionTotal: position.stake.active,
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
