import { type PositionRow } from '../lib';

/**
 * The one description of the table's shape.
 *
 * The loading state and the loaded state render the same columns, at the same
 * widths, in the same order — sharing this list is what makes "zero layout
 * shift" a property of the code rather than of two lists staying in sync by
 * hand.
 */
export const POSITION_COLUMNS = [
  { key: 'accountId', titleKey: 'columns.account', width: '30%', sortable: false },
  { key: 'staked', titleKey: 'columns.staked', width: '14%', sortable: true },
  { key: 'sharePercent', titleKey: 'columns.share', width: '8%', sortable: true },
  { key: 'status', titleKey: 'columns.status', width: '11%', sortable: true },
  { key: 'apy', titleKey: 'columns.apy', width: '8%', sortable: true },
  { key: 'activeValidatorCount', titleKey: 'columns.validators', width: '10%', sortable: true },
  { key: 'asset', titleKey: 'columns.unclaimed', width: '15%', sortable: false },
  { key: 'access', titleKey: null, width: '4%', sortable: false },
] as const satisfies readonly {
  key: keyof PositionRow;
  titleKey: string | null;
  width: string;
  sortable: boolean;
}[];

export type PositionColumnKey = (typeof POSITION_COLUMNS)[number]['key'];
