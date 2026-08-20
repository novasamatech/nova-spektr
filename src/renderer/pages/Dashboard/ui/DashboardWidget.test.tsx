import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DashboardWidget } from './DashboardWidget';

vi.mock('@/shared/i18n', () => ({
  useI18n: vi.fn().mockReturnValue({ t: (key: string) => key }),
}));

vi.mock('./WidgetSortableContext', () => ({
  useWidgetSortable: () => null,
}));

// The overflow rules are load-bearing: scrolling on the x axis is what lets the
// scrollbar pair blink (see SCROLL_CLASS).
describe('DashboardWidget', () => {
  const body = () => screen.getByTestId('content').parentElement;

  it('scrolls vertically only', () => {
    render(
      <DashboardWidget>
        <div data-testid="content" />
      </DashboardWidget>,
    );

    expect(body()).toHaveClass('overflow-y-auto');
    expect(body()).toHaveClass('overflow-x-hidden');
  });

  it('does not scroll at all when the widget sizes its content from the cell', () => {
    render(
      <DashboardWidget scroll={false}>
        <div data-testid="content" />
      </DashboardWidget>,
    );

    expect(body()).toHaveClass('overflow-hidden');
    expect(body()).not.toHaveClass('overflow-y-auto');
  });
});
