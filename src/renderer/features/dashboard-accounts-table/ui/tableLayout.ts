/**
 * Single source for the grid template, shared by the header row, group rows and
 * the loading skeleton — keeping all three in lockstep is what keeps columns
 * from drifting relative to each other.
 */
export const GRID_TEMPLATE = 'grid grid-cols-[168px_132px_1fr_1fr_1fr_0.95fr_1.15fr] items-center gap-x-3 px-4';

export const NUMERIC_COLUMNS = ['transferable', 'staked', 'governance', 'other', 'total'] as const;

/**
 * Group header row chrome — shared by the real `GroupSection` header button and
 * `TableSkeleton`'s stub, so the two can't drift apart in height/background.
 */
export const GROUP_HEADER_CLASS = 'h-12 items-center gap-x-2 bg-block-background px-4';

/** Data row chrome — shared by real rows and skeleton row stubs. */
export const ROW_CLASS = 'min-h-12 border-b border-divider';
