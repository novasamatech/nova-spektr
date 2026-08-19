/**
 * The rewards table's shape, in one place.
 *
 * The loading state renders the **same** `Table` with the same widths and the
 * cells blanked, so nothing shifts when the data arrives. Widths kept here
 * rather than inline is what makes that possible — two copies of `'22%'` drift
 * the moment one of them is edited.
 */
export type RewardColumnKey = 'validatorId' | 'nominators' | 'accrued' | 'unclaimed' | 'payouts';

export type RewardColumn = {
  key: RewardColumnKey;
  width: string;
  /** Width of the blank standing in for the cell while it loads. */
  placeholder: string;
};

export const REWARD_COLUMNS: RewardColumn[] = [
  { key: 'validatorId', width: '30%', placeholder: '160px' },
  { key: 'nominators', width: '22%', placeholder: '72px' },
  { key: 'accrued', width: '20%', placeholder: '80px' },
  { key: 'unclaimed', width: '18%', placeholder: '72px' },
  { key: 'payouts', width: '10%', placeholder: '56px' },
];

export const rewardColumnWidth = (key: RewardColumnKey): string =>
  REWARD_COLUMNS.find((column) => column.key === key)?.width ?? '';
