import { GRID_COLUMNS, ROW_HEIGHT_PX } from './layout-engine';

/** Matches the grid's `gap-4`. */
export const GAP_PX = 16;

export type GridMetrics = {
  /** Distance from one column's start to the next — a column plus its gap. */
  colStride: number;
  /** Distance from one row's start to the next. */
  rowStride: number;
};

/**
 * How wide one grid step is, measured off the live element rather than assumed.
 *
 * `clientWidth` includes the container's own padding, and the columns are laid
 * out inside it, so the padding has to come off before the width is divided.
 * Dividing the padded width instead over-estimates every column and the error
 * accumulates left-to-right — by the last column it is a whole column wide,
 * which is exactly where a dropped widget used to land one column short.
 */
export function getGridMetrics(grid: HTMLElement): GridMetrics {
  const styles = getComputedStyle(grid);
  const paddingLeft = Number.parseFloat(styles.paddingLeft) || 0;
  const paddingRight = Number.parseFloat(styles.paddingRight) || 0;
  const contentWidth = Math.max(0, grid.clientWidth - paddingLeft - paddingRight);

  // n columns carry n-1 gaps, so one stride is `(content + gap) / n`.
  return {
    colStride: (contentWidth + GAP_PX) / GRID_COLUMNS,
    rowStride: ROW_HEIGHT_PX + GAP_PX,
  };
}

/**
 * A viewport point in grid-content coordinates.
 *
 * The grid is its own scroll container, so a client rect describes the
 * _visible_ box: past the first screenful, content coordinates and viewport
 * coordinates differ by the scroll offset. Leaving that out placed a dropped
 * widget one row too high for every row the user had scrolled past.
 */
export function toGridContentPoint(grid: HTMLElement, point: { x: number; y: number }): { x: number; y: number } {
  const rect = grid.getBoundingClientRect();
  const styles = getComputedStyle(grid);

  // `clientLeft/clientTop` are the borders; padding is the gutter the first
  // column and row start after.
  return {
    x: point.x - rect.left - grid.clientLeft - (Number.parseFloat(styles.paddingLeft) || 0) + grid.scrollLeft,
    y: point.y - rect.top - grid.clientTop - (Number.parseFloat(styles.paddingTop) || 0) + grid.scrollTop,
  };
}
