/**
 * The one description of the table's shape.
 *
 * The loading state and the loaded state render the same columns, at the same
 * widths, in the same order — sharing this list is what makes "zero layout
 * shift" a property of the code rather than of two lists staying in sync by
 * hand.
 */
export const POSITION_COLUMNS = [
  { id: 'network', titleKey: 'columns.network', width: '7%', placeholder: '56px' },
  { id: 'chain', titleKey: 'columns.chain', width: '9%', placeholder: '72px' },
  { id: 'account', titleKey: 'columns.account', width: '16%', placeholder: '180px' },
  { id: 'address', titleKey: 'columns.address', width: '9%', placeholder: '72px' },
  { id: 'role', titleKey: 'columns.role', width: '7%', placeholder: '56px' },
  { id: 'totalBalance', titleKey: 'columns.totalBalance', width: '9%', placeholder: '72px' },
  { id: 'nominatingStake', titleKey: 'columns.nominatingStake', width: '9%', placeholder: '72px' },
  { id: 'selfStake', titleKey: 'columns.selfStake', width: '8%', placeholder: '64px' },
  { id: 'staked', titleKey: 'columns.staked', width: '10%', placeholder: '80px' },
  { id: 'sharePercent', titleKey: 'columns.share', width: '6%', placeholder: '36px' },
  { id: 'status', titleKey: 'columns.status', width: '8%', placeholder: '56px' },
  { id: 'apy', titleKey: 'columns.apy', width: '5%', placeholder: '40px' },
  { id: 'activeValidatorCount', titleKey: 'columns.validators', width: '6%', placeholder: '52px' },
  { id: 'unclaimed', titleKey: 'columns.unclaimed', width: '9%', placeholder: '88px' },
  { id: 'accessMode', titleKey: null, width: '4%', placeholder: '16px' },
] as const satisfies readonly {
  id: string;
  titleKey: string | null;
  width: string;
  placeholder: string;
}[];

export type PositionColumnId = (typeof POSITION_COLUMNS)[number]['id'];

/**
 * Fifteen columns do not fit a laptop. Squeezing them would turn every amount
 * into an ellipsis, which defeats the point of a table people compare numbers
 * in, so the card scrolls sideways instead.
 */
export const POSITIONS_MIN_WIDTH = 1720;
