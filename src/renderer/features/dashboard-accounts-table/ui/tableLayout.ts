/**
 * The table has two column sets, switched on the width of the widget itself —
 * `@[900px]`, a container query, never a viewport breakpoint: the widget is
 * resizable (2 to 4 of the dashboard's grid columns), so one and the same
 * window shows it 735px wide at 2 columns and 1500px at 4, and the viewport
 * says nothing about how much room these columns have.
 *
 * Below 900px the five numeric columns would be left ~65px each and every
 * amount would wrap onto three lines. So the compact set drops the two things a
 * person can recover from elsewhere:
 *
 * - The **address** — identical for every row of a group apart from the chain's
 *   own SS58 prefix, which the Chain column already names, and still exported
 *   in full by the CSV;
 * - The **chain's name** — the icon stays, with the name on hover.
 *
 * The purpose split, which is what the table exists to show, keeps its space at
 * both widths.
 *
 * Every class below is spelled out in full on purpose: Tailwind scans source
 * text for literal class names, so a template-interpolated `@[900px]:` prefix
 * would compile to no CSS at all.
 */

/**
 * Single source for the grid template, shared by the header row, group rows and
 * the loading skeleton — keeping all three in lockstep is what keeps columns
 * from drifting relative to each other.
 *
 * Compact is the base and wide the override (container queries are min-width).
 * A hidden cell leaves the grid flow entirely, so the compact template
 * describes six columns rather than seven with an empty one. Its first column
 * is 76px: 18px row indent + 16px chain icon on a row, and above them the
 * fold-all button plus the sortable "Chain" label, which is what sets the
 * width.
 *
 * Every numeric column flexes — Total a shade wider, since it carries the
 * largest number of the five. The redesign's fixed 140px Total was tried and
 * rolled back: at the widget's narrow sizes a fixed track eats the space the
 * flexing columns need more than Total does.
 */
export const GRID_TEMPLATE =
  'grid grid-cols-[76px_1fr_1fr_1fr_0.95fr_1.15fr] items-center gap-x-3 pl-4 @[900px]:grid-cols-[168px_132px_1fr_1fr_1fr_0.95fr_1.15fr]';

/**
 * Cells that exist only at the full width — the address column and the chain
 * name. Shared so the header, the data rows and the skeleton can't disagree
 * about which columns are on screen.
 */
export const WIDE_ONLY_CLASS = 'hidden @[900px]:block';

/**
 * The Total column, on every surface that has one — the header, a data row, a
 * group's subtotal.
 *
 * Total is the one number a person scans a hundred rows for, so it is the one
 * column that gets a surface of its own: a hairline on its left edge and a tint
 * that runs to the card's right edge. That last part is why the grid pads left
 * only — `pr-4` would leave a white gutter between the tint and the edge, and
 * the column would read as a floating box rather than the table's margin.
 *
 * Both this tint and the group header's are `extended-block-background`, not
 * `block-background`: the latter is the very same colour as the page behind the
 * card, and since both surfaces run to the card's edge the card's outline
 * vanished wherever they touched it. The lighter tint keeps the card white
 * against the page while still reading as a band over the plain rows.
 */
export const TOTAL_CELL_CLASS =
  'flex h-full flex-col items-end justify-center self-stretch border-l border-divider bg-extended-block-background pr-4 whitespace-nowrap';

export const NUMERIC_COLUMNS = ['transferable', 'staked', 'governance', 'other', 'total'] as const;

/**
 * Group header row chrome — shared by the real `GroupSection` header button and
 * `TableSkeleton`'s stub, so the two can't drift apart in height/background.
 *
 * The bottom divider is what keeps a run of _collapsed_ accounts legible: with
 * every group folded, the table is nothing but these grey bands stacked on each
 * other, and without a rule between them they read as one block instead of one
 * account per line.
 */
export const GROUP_HEADER_CLASS = 'h-14 border-b border-divider bg-extended-block-background';

/**
 * The account block in a group header — everything left of the subtotal, laid
 * over the data columns it sits above. The header shares `GRID_TEMPLATE` rather
 * than being its own flex row, which is what puts an account's subtotal in the
 * same track as its rows' totals at any width.
 */
export const GROUP_HEADER_SPAN_CLASS = 'col-span-5 flex min-w-0 items-center gap-x-2 @[900px]:col-span-6';

/** Data row chrome — shared by real rows and skeleton row stubs. */
export const ROW_CLASS = 'min-h-12 border-b border-divider';

/**
 * An amount never breaks across lines.
 *
 * A grid track sized `1fr` is really `minmax(auto, 1fr)`, and `auto` for
 * wrapping text is the widest _word_ — `6.51894`, not `6.51894 USDT`. So a
 * column would happily shrink under its own content and split the number from
 * its symbol, which is how `6.51894 USDT` came to sit on two lines. Forbidding
 * the break makes the track's minimum the whole string, so the grid has to give
 * every amount its width; where the sum no longer fits, the rows region scrolls
 * sideways instead (see `AccountsTableView`) — a number cut in half is worse
 * than a scrollbar.
 */
export const AMOUNT_CELL_CLASS = 'flex flex-col items-end whitespace-nowrap';
