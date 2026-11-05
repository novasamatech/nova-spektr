import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { I18Provider } from '@/shared/i18n';
import { ThemeProvider } from '@/shared/ui-kit';
import { summarizePositions } from '@/aggregates/staking-positions';
import { type StakingKpiData } from '../../hooks/useStakingKpi';
import { RewardsWidget } from '../RewardsWidget';

/**
 * The assembled KPI figures are the boundary: what the card says about a reward
 * window that did not answer in full is read off them.
 */
const kpiState = vi.hoisted(() => {
  const state: { current: unknown } = { current: null };

  return state;
});

vi.mock('../../hooks/useStakingKpi', () => ({ useStakingKpi: () => kpiState.current }));
vi.mock('../../hooks/useChainEras', () => ({
  useChainEras: () => ({}),
  useEraDurations: () => ({}),
  useChainHistoryDepths: () => ({}),
}));

const accountIds = ['0x01'];

const kpi = (overrides: Partial<StakingKpiData>): StakingKpiData => ({
  positions: [],
  summary: summarizePositions([]),
  pending: false,
  currency: null,
  fiatFlag: false,

  totalStakedFiat: '0',
  stakedAmounts: [],
  unbondingFooter: null,

  weightedApy: null,
  earningPositionCount: 0,
  networkAvg: null,

  rewardsWindowDays: 30,
  rewardsFiat: '0',
  rewardAmounts: [{ symbol: 'DOT', precision: 10, amount: '12500000000000' }],
  rewardsCompleteness: 'complete',
  rewardsIncompleteNetworks: [],
  rewardsPending: false,
  unclaimedFooter: null,
  retryUnclaimed: () => Promise.resolve(),

  breakdownRows: [],
  claimRows: [],
  positionRows: [],

  walletByAccount: {},
  ...overrides,
});

const renderWidget = (data: StakingKpiData) => {
  kpiState.current = data;

  return render(
    <I18Provider>
      <ThemeProvider>
        <RewardsWidget accountIds={accountIds} allEntries={[]} />
      </ThemeProvider>
    </I18Provider>,
  );
};

const EARNED = '+1.25K DOT';
const WINDOW = 'last 30d';
const INCOMPLETE = "Incomplete — rewards on Kusama Asset Hub couldn't be loaded completely";

describe('features/dashboard-staking-kpi/ui/RewardsWidget · reward window', () => {
  beforeEach(() => {
    kpiState.current = null;
  });

  it('shows the plain total when every network answered in full', async () => {
    renderWidget(kpi({}));

    expect(await screen.findByText(EARNED)).toBeInTheDocument();
    expect(screen.getByText(WINDOW)).toBeInTheDocument();
    expect(screen.queryByText(INCOMPLETE)).not.toBeInTheDocument();
  });

  it('marks the total as incomplete and names the network that did not answer in full', async () => {
    renderWidget(kpi({ rewardsCompleteness: 'partial', rewardsIncompleteNetworks: ['Kusama Asset Hub'] }));

    // What was found is still shown — it is a lower bound — but never without
    // the note that it is one.
    expect(await screen.findByText(EARNED)).toBeInTheDocument();
    expect(screen.getByText(INCOMPLETE)).toBeInTheDocument();
    expect(screen.queryByText(WINDOW)).not.toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveAccessibleName(expect.stringContaining(INCOMPLETE));
  });

  it('says the rewards could not be loaded instead of showing zero', async () => {
    renderWidget(
      kpi({
        rewardAmounts: [],
        rewardsCompleteness: 'unavailable',
        rewardsIncompleteNetworks: ['Polkadot Asset Hub', 'Kusama Asset Hub'],
      }),
    );

    expect(await screen.findByText("Couldn't load")).toBeInTheDocument();
    expect(screen.queryByText('—')).not.toBeInTheDocument();
    expect(screen.queryByText(/^\+?0(\.0+)? DOT$/)).not.toBeInTheDocument();
  });

  it('shows the figure as loading while a network has not answered yet', async () => {
    renderWidget(kpi({ rewardAmounts: [], rewardsPending: true }));

    // A `$0` or a partial sum before every network answered would read as the
    // total.
    expect(await screen.findByText('Rewards')).toBeInTheDocument();
    expect(screen.queryByText(EARNED)).not.toBeInTheDocument();
    expect(screen.queryByText(WINDOW)).not.toBeInTheDocument();
  });
});
