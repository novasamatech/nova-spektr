/**
 * Largest stake first — the order the table opens in, and the one it returns to
 * when a user clicks a header a third time to clear their own sort.
 *
 * The comparators themselves live on the columns (`ui/PositionsTable`), where
 * `DataTable` reads them: a planck amount runs past `Number.MAX_SAFE_INTEGER`,
 * so those columns compare as big integers rather than as numbers.
 */
export const DEFAULT_SORT = { column: 'staked', direction: 'desc' } as const;
