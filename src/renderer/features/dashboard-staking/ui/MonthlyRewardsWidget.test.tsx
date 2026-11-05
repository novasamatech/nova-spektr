import { render, screen } from '@testing-library/react';
import { type PropsWithChildren } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { type DataCompleteness } from '@/domains/staking';
import { type MonthlyRewardsChartData } from '../hooks/useMonthlyRewardsChart';

import { MonthlyRewardsWidget } from './MonthlyRewardsWidget';

const chartState = vi.hoisted(() => {
  const state: { current: unknown } = { current: null };

  return state;
});

vi.mock('@/shared/i18n', () => ({
  useI18n: vi.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

vi.mock('@/pages/Dashboard', () => ({
  DashboardWidget: ({ children }: PropsWithChildren) => <div>{children}</div>,
}));

vi.mock('@/domains/network', () => ({ useAccountName: () => '' }));

vi.mock('../hooks/useMonthlyRewardsChart', () => ({ useMonthlyRewardsChart: () => chartState.current }));

const UNAVAILABLE_TOTAL = 'dashboard.staking.rewardsChart.unavailable.total';
const UNAVAILABLE_TITLE = 'dashboard.staking.rewardsChart.unavailable.title';
const INCOMPLETE_NOTE = 'dashboard.staking.rewardsChart.incomplete.note';
const INCOMPLETE_TITLE = 'dashboard.staking.rewardsChart.incomplete.title';
const NO_DATA = 'dashboard.monthlyRewards.noData';

const renderWidget = (dotCompleteness: DataCompleteness, token: string) => {
  const total = { token, fiat: '0', symbol: 'DOT', precision: 10 };
  const data: MonthlyRewardsChartData = {
    dotBars: [],
    ksmBars: [],
    dotAccounts: [],
    ksmAccounts: [],
    dotTotal: total,
    ksmTotal: { ...total, symbol: 'KSM' },
    dotCompleteness,
    ksmCompleteness: 'complete',
    pending: false,
    fiatFlag: true,
    currency: null,
  };
  chartState.current = data;

  return render(<MonthlyRewardsWidget accountIds={['0x01']} allEntries={[]} />);
};

describe('features/dashboard-staking/ui/MonthlyRewardsWidget · history completeness', () => {
  beforeEach(() => {
    chartState.current = null;
  });

  test('should keep the empty state for a complete history with no rewards', () => {
    renderWidget('complete', '0');

    expect(screen.getByText('0 DOT')).toBeInTheDocument();
    expect(screen.getByText(NO_DATA)).toBeInTheDocument();
    expect(screen.queryByText(INCOMPLETE_NOTE)).not.toBeInTheDocument();
  });

  test('should mark the total as incomplete and not claim there are no rewards', () => {
    renderWidget('partial', '12.5');

    expect(screen.getByText('12.5 DOT')).toBeInTheDocument();
    expect(screen.getByText(INCOMPLETE_NOTE)).toBeInTheDocument();
    expect(screen.getByText(INCOMPLETE_TITLE)).toBeInTheDocument();
    expect(screen.queryByText(NO_DATA)).not.toBeInTheDocument();
  });

  test('should say the history could not be loaded instead of showing zero', () => {
    renderWidget('unavailable', '0');

    expect(screen.getByText(UNAVAILABLE_TOTAL)).toBeInTheDocument();
    expect(screen.getByText(UNAVAILABLE_TITLE)).toBeInTheDocument();
    expect(screen.queryByText('0 DOT')).not.toBeInTheDocument();
    expect(screen.queryByText(NO_DATA)).not.toBeInTheDocument();
  });
});
