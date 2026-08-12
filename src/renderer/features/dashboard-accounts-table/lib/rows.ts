import { type BN } from '@polkadot/util';
import { default as BigNumber } from 'bignumber.js';

import { type PurposeSplit } from './balancePurpose';
import { type AccountGroup, type AccountRow, type NumericKey } from './types';

/**
 * Planck → whole tokens at full precision. Mirrors
 * `dashboard-staking-kpi/lib/csv.ts#toTokens` — same BigNumber primitive, same
 * shape — kept feature-local rather than shared since fiat math tolerates the
 * `Number()` precision loss the CSV export explicitly avoids.
 */
const toTokens = (amount: string, precision: number): string => {
  return new BigNumber(amount || '0').shiftedBy(-precision).toFixed();
};

export const buildRowFiat = (
  split: PurposeSplit,
  price: number | null,
  precision: number,
): Record<NumericKey, number | null> => {
  if (price === null) {
    return { transferable: null, staked: null, governance: null, other: null, total: null };
  }

  const toFiat = (bn: BN) => Number(toTokens(bn.toString(), precision)) * price;

  const transferable = toFiat(split.transferable);
  const staked = split.staked === null ? null : toFiat(split.staked);
  const governance = split.governance === null ? null : toFiat(split.governance);
  const other = toFiat(split.other);
  const total = transferable + (staked ?? 0) + (governance ?? 0) + other;

  return { transferable, staked, governance, other, total };
};

export const groupRows = (rows: AccountRow[]): AccountGroup[] => {
  const groups = new Map<string, AccountRow[]>();
  for (const row of rows) {
    const list = groups.get(row.groupKey) ?? [];
    list.push(row);
    groups.set(row.groupKey, list);
  }

  return [...groups.entries()].map(([key, accountRows]) => {
    // accountRows is never empty: an entry only exists because at least one row was pushed to it.
    const firstRow = accountRows[0]!;
    const priced = accountRows.map((row) => row.fiat.total).filter((value): value is number => value !== null);

    return {
      key,
      accountId: firstRow.accountId,
      name: firstRow.displayName,
      wallet: firstRow.wallet,
      walletTypeBucket: firstRow.walletTypeBucket,
      rows: accountRows,
      subtotalFiat: priced.length > 0 ? priced.reduce((a, b) => a + b, 0) : null,
      chainCount: new Set(accountRows.map((row) => row.chain.chainId)).size,
      assetCount: new Set(accountRows.map((row) => row.asset.symbol)).size,
    };
  });
};
