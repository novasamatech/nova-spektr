import { render, screen } from '@testing-library/react';
import { type PropsWithChildren } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { type DataCompleteness } from '@/domains/staking';
import { type TotalRewardsData } from '../hooks/useTotalRewards';

import { TotalRewardsWidget } from './TotalRewardsWidget';

const totalsState = vi.hoisted(() => {
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

vi.mock('../hooks/useTotalRewards', () => ({ useTotalRewards: () => totalsState.current }));
vi.mock('./ChainAllocationChart', () => ({ ChainAllocationChart: () => null }));
vi.mock('./RewardsDetailModal', () => ({ RewardsDetailModal: () => null }));

const UNAVAILABLE = 'dashboard.staking.rewardsChart.unavailable.total';
const INCOMPLETE = 'dashboard.staking.rewardsChart.incomplete.note';
const NO_REWARDS = 'dashboard.totalRewards.noRewards';

const renderWidget = (completeness: DataCompleteness, totalFiat: string | null) => {
  const data: TotalRewardsData = {
    chains: [],
    rewardsMapByChain: {},
    totalFiat,
    completeness,
    pending: false,
    fiatFlag: true,
    currency: {
      id: 0,
      code: 'USD',
      name: 'US Dollar',
      symbol: '$',
      category: 'fiat',
      popular: true,
      coingeckoId: 'usd',
    },
  };
  totalsState.current = data;

  return render(<TotalRewardsWidget accountIds={['0x01']} allEntries={[]} />);
};

describe('features/dashboard-staking/ui/TotalRewardsWidget · rewards completeness', () => {
  beforeEach(() => {
    totalsState.current = null;
  });

  test('should show the plain total of a complete answer', () => {
    renderWidget('complete', '12.5');

    expect(screen.getByText('$12.5')).toBeInTheDocument();
    expect(screen.queryByText(INCOMPLETE)).not.toBeInTheDocument();
  });

  test('should mark the total as incomplete when a source did not answer', () => {
    renderWidget('partial', '12.5');

    expect(screen.getByText('$12.5')).toBeInTheDocument();
    expect(screen.getByText(INCOMPLETE)).toBeInTheDocument();
    expect(screen.queryByText(NO_REWARDS)).not.toBeInTheDocument();
  });

  test('should say the rewards could not be loaded instead of showing zero', () => {
    renderWidget('unavailable', null);

    expect(screen.getByText(UNAVAILABLE)).toBeInTheDocument();
    expect(screen.queryByText('$0')).not.toBeInTheDocument();
    expect(screen.queryByText(NO_REWARDS)).not.toBeInTheDocument();
  });
});
