import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { type RewardWindow } from '../../lib/reward-period';
import { PeriodTabs } from '../PeriodTabs';

vi.mock('@/shared/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

// Local-time days, the way the picker hands them over.
const july = { from: new Date(2026, 6, 1), to: new Date(2026, 6, 31) };
const customJuly: RewardWindow = { period: 'custom', range: july };

const tab = (period: RewardWindow['period']) =>
  screen.getByRole('button', { name: `dashboard.staking.kpi.rewards.period.${period}` });

describe('PeriodTabs', () => {
  it('shows the picked range under the Custom tab', () => {
    render(<PeriodTabs value={customJuly} onChange={vi.fn()} />);

    expect(screen.getByText('Jul 01 - Jul 31')).not.toBeNull();
  });

  it('hides the picker, not the range, when a preset takes over', () => {
    const onChange = vi.fn();
    render(<PeriodTabs value={customJuly} onChange={onChange} />);

    fireEvent.click(tab('30d'));

    expect(onChange).toHaveBeenCalledWith({ period: '30d', range: july });
  });

  it('keeps the field out of sight while a preset is on', () => {
    render(<PeriodTabs value={{ period: '30d', range: july }} onChange={vi.fn()} />);

    expect(screen.queryByText('Jul 01 - Jul 31')).toBeNull();
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
