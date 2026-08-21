import { type PointerEvent } from 'react';

import { CELL_COLUMN_ATTRIBUTE, HOVERED_COLUMN_ATTRIBUTE } from './layout';

const setHoveredColumn = (scroller: HTMLElement, column: string | null) => {
  // `pointerover` fires for every element the pointer enters; skip the write
  // when the column did not change so moving inside one cell costs nothing.
  if (scroller.getAttribute(HOVERED_COLUMN_ATTRIBUTE) === column) return;

  if (column) {
    scroller.setAttribute(HOVERED_COLUMN_ATTRIBUTE, column);
  } else {
    scroller.removeAttribute(HOVERED_COLUMN_ATTRIBUTE);
  }
};

/**
 * Delegated `onPointerOver` for the table scroller: finds the cell under the
 * pointer by its `data-column` and mirrors it into `data-hovered-column` on the
 * scroller, which the cells' hover classes key off. A pointer over something
 * that is not a cell (row gap, section heading) clears it.
 */
export const handleColumnPointerOver = (event: PointerEvent<HTMLElement>) => {
  const cell = event.target instanceof Element ? event.target.closest(`[${CELL_COLUMN_ATTRIBUTE}]`) : null;
  const column = cell && event.currentTarget.contains(cell) ? cell.getAttribute(CELL_COLUMN_ATTRIBUTE) : null;

  setHoveredColumn(event.currentTarget, column);
};

/**
 * Delegated `onPointerLeave` for the table scroller: no pointer, no highlighted
 * column.
 */
export const handleColumnPointerLeave = (event: PointerEvent<HTMLElement>) => {
  setHoveredColumn(event.currentTarget, null);
};
