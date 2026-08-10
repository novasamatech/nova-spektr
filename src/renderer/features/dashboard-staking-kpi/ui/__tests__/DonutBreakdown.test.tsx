import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { type DonutSlice, DonutBreakdown } from '../DonutBreakdown';

const slices: DonutSlice[] = [
  { id: 'a', value: 6, color: '#111111' },
  { id: 'b', value: 4, color: '#222222' },
];

const renderDonut = (onHover: (id: string | null) => void) =>
  render(
    <DonutBreakdown data={slices} hoveredId={null} onHover={onHover}>
      <span>total</span>
    </DonutBreakdown>,
  );

describe('DonutBreakdown hover', () => {
  it('reports the slice the pointer entered', () => {
    const onHover = vi.fn();
    const { container } = renderDonut(onHover);

    const sectors = container.querySelectorAll('.recharts-pie-sector');
    expect(sectors).toHaveLength(slices.length);

    fireEvent.mouseEnter(sectors[1]!);

    expect(onHover).toHaveBeenLastCalledWith('b');
  });

  /**
   * The class name is the fix's only tie to Recharts' markup — if a version
   * bump renames it, every move would read as "off the ring" and the chart
   * would never highlight. This test fails loudly instead.
   */
  it('holds the hover while the pointer stays on a sector', () => {
    const onHover = vi.fn();
    const { container } = renderDonut(onHover);

    const sector = container.querySelector('.recharts-pie-sector')!;
    fireEvent.mouseMove(sector, { bubbles: true });

    expect(onHover).not.toHaveBeenCalled();
  });

  it('clears the hover when the pointer moves off the ring but stays in the box', () => {
    const onHover = vi.fn();
    const { container } = renderDonut(onHover);

    // The hole in the middle: inside the chart, on no slice.
    fireEvent.mouseMove(container.querySelector('svg')!, { bubbles: true });

    expect(onHover).toHaveBeenLastCalledWith(null);
  });

  it('clears the hover when the pointer leaves the chart', () => {
    const onHover = vi.fn();
    const { container } = renderDonut(onHover);

    fireEvent.mouseLeave(container.firstElementChild!);

    expect(onHover).toHaveBeenLastCalledWith(null);
  });
});
