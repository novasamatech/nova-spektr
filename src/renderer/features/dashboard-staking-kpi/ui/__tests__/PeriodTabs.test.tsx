import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { type RewardWindow, REWARD_PERIODS } from '../../lib/reward-period';
import { PeriodTabs } from '../PeriodTabs';

vi.mock('@/shared/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

/**
 * The picker is the one button beyond the period tabs. Counted rather than
 * matched by its formatted dates so the test does not lean on the picker's own
 * date format.
 */
const pickerShown = () => screen.getAllByRole('button').length === REWARD_PERIODS.length + 1;

// Local-time days, the way the picker hands them over.
const july = { from: new Date(2026, 6, 1), to: new Date(2026, 6, 31) };
const customJuly: RewardWindow = { period: 'custom', range: july };

const tab = (period: RewardWindow['period']) =>
  screen.getByRole('button', { name: `dashboard.staking.kpi.rewards.period.${period}` });

describe('PeriodTabs', () => {
  it('shows the picker under the Custom tab', () => {
    render(<PeriodTabs value={customJuly} onChange={vi.fn()} />);

    expect(pickerShown()).toBe(true);
  });

  it('hides the picker, not the range, when a preset takes over', () => {
    const onChange = vi.fn();
    render(<PeriodTabs value={customJuly} onChange={onChange} />);

    fireEvent.click(tab('30d'));

    expect(onChange).toHaveBeenCalledWith({ period: '30d', range: july });
  });

  it('keeps the field out of sight while a preset is on', () => {
    render(<PeriodTabs value={{ period: '30d', range: july }} onChange={vi.fn()} />);

    expect(pickerShown()).toBe(false);
  });

  it('brings the remembered range back with the Custom tab', () => {
    const onChange = vi.fn();
    render(<PeriodTabs value={{ period: '30d', range: july }} onChange={onChange} />);

    fireEvent.click(tab('custom'));

    expect(onChange).toHaveBeenCalledWith({ period: 'custom', range: july });
  });

  it('opens Custom empty when nothing was ever picked', () => {
    const onChange = vi.fn();
    render(<PeriodTabs value={{ period: '30d', range: null }} onChange={onChange} />);

    fireEvent.click(tab('custom'));

    expect(onChange).toHaveBeenCalledWith({ period: 'custom', range: null });
  });
});
