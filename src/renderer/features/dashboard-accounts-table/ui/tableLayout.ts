/**
 * Single source for the grid template, shared by the header row, group rows and
 * the loading skeleton — keeping all three in lockstep is what keeps columns
 * from drifting relative to each other.
 */
export const GRID_TEMPLATE = 'grid grid-cols-[168px_132px_1fr_1fr_1fr_0.95fr_1.15fr] items-center gap-x-3 px-4';

export const NUMERIC_COLUMNS = ['transferable', 'staked', 'governance', 'other', 'total'] as const;
