import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { handleColumnPointerLeave, handleColumnPointerOver } from '../column-hover';
import { COLUMN_DEFAULT_WIDTHS, HOVERED_COLUMN_ATTRIBUTE, getCellProps, getHoverableProps } from '../layout';

const renderTable = () =>
  render(
    <div data-testid="scroller" onPointerOver={handleColumnPointerOver} onPointerLeave={handleColumnPointerLeave}>
      <div {...getCellProps('submitter', COLUMN_DEFAULT_WIDTHS)}>
        <span data-testid="submitter-content">Alice</span>
      </div>
      <div {...getHoverableProps('description')} data-testid="description" />
      <div data-testid="gap" />
    </div>,
  );

describe('aggregates/operations-table-layout/column-hover', () => {
  it('should mirror the hovered cell column onto the scroller', () => {
    renderTable();

    fireEvent.pointerOver(screen.getByTestId('submitter-content'));

    expect(screen.getByTestId('scroller')).toHaveAttribute(HOVERED_COLUMN_ATTRIBUTE, 'submitter');
  });

  it('should switch the column when the pointer moves to another cell', () => {
    renderTable();

    fireEvent.pointerOver(screen.getByTestId('submitter-content'));
    fireEvent.pointerOver(screen.getByTestId('description'));

    expect(screen.getByTestId('scroller')).toHaveAttribute(HOVERED_COLUMN_ATTRIBUTE, 'description');
  });

  it('should clear the column over something that is not a cell', () => {
    renderTable();

    fireEvent.pointerOver(screen.getByTestId('submitter-content'));
    fireEvent.pointerOver(screen.getByTestId('gap'));

    expect(screen.getByTestId('scroller')).not.toHaveAttribute(HOVERED_COLUMN_ATTRIBUTE);
  });

  it('should clear the column when the pointer leaves the scroller', () => {
    renderTable();

    fireEvent.pointerOver(screen.getByTestId('submitter-content'));
    fireEvent.pointerLeave(screen.getByTestId('scroller'));

    expect(screen.getByTestId('scroller')).not.toHaveAttribute(HOVERED_COLUMN_ATTRIBUTE);
  });

  it('should tag cells with their column and the hover class that keys off the scroller', () => {
    const props = getCellProps('status', COLUMN_DEFAULT_WIDTHS);

    expect(props['data-column']).toBe('status');
    expect(props.className).toContain('group-data-[hovered-column=status]/table:bg-hover');
  });
});
