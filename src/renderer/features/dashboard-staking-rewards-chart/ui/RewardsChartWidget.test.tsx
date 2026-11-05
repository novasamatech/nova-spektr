import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { I18Provider } from '@/shared/i18n';
import { dotAsset, polkadotAssetHubChain } from '@/shared/mocks';
import { ThemeProvider } from '@/shared/ui-kit';
import { type RewardAsset } from '../hooks/useRewardAssets';
import { type useRewardsChart } from '../hooks/useRewardsChart';
import { type RewardBucket } from '../lib/types';

import { RewardsChartWidget } from './RewardsChartWidget';

type ChartData = ReturnType<typeof useRewardsChart>;

/**
 * The bucketed reward history is the boundary: what the card says about a
 * history that did not load in full is read off it.
 */
const chartState = vi.hoisted(() => {
  const state: { current: unknown } = { current: null };

  return state;
});

const asset: RewardAsset = {
  chainId: polkadotAssetHubChain.chainId,
  chain: polkadotAssetHubChain,
  asset: dotAsset,
  symbol: dotAsset.symbol,
  color: '#e6007a',
  hasPosition: true,
};

vi.mock('../hooks/useRewardAssets', () => ({ useRewardAssets: () => [asset] }));
vi.mock('../hooks/useRewardsChart', () => ({ useRewardsChart: () => chartState.current }));
vi.mock('../hooks/useRewardsEraAnchor', () => ({ useRewardsEraAnchor: () => null }));
vi.mock('../hooks/useWalletByAccountId', () => ({ useWalletByAccountId: () => ({}) }));
vi.mock('./RewardsBarChart', () => ({ RewardsBarChart: () => <div data-testid="reward-bars" /> }));
vi.mock('@/widgets/price', () => ({ AssetFiatBalance: () => null }));

const bucket: RewardBucket = {
  start: Date.UTC(2026, 6, 20),
  end: Date.UTC(2026, 6, 21),
  granularity: 'day',
  total: '125000000000',
  accounts: [{ accountId: '0x01', amount: '125000000000', share: 1 }],
};

const chart = (overrides: Partial<ChartData>): ChartData => ({
  buckets: [bucket],
  total: '125000000000',
  hasData: true,
  completeness: 'complete',
  pending: false,
  ...overrides,
});

const renderWidget = (data: ChartData) => {
  chartState.current = data;

  return render(
    <I18Provider>
      <ThemeProvider>
        <RewardsChartWidget accountIds={['0x01']} allEntries={[]} />
      </ThemeProvider>
    </I18Provider>,
  );
};

const TOTAL = /12\.5\s*DOT/;
const INCOMPLETE_NOTE = "incomplete — some history couldn't be loaded";
const INCOMPLETE_TITLE = 'Reward history is incomplete';
const UNAVAILABLE_TITLE = "Couldn't load reward history";
const NO_REWARDS = 'No rewards yet';

describe('features/dashboard-staking-rewards-chart/ui/RewardsChartWidget · history completeness', () => {
  beforeEach(() => {
    chartState.current = null;
  });

  it('shows the plain total over a history every source answered for', async () => {
    renderWidget(chart({}));

    expect(await screen.findByText(TOTAL)).toBeInTheDocument();
    expect(screen.getByTestId('reward-bars')).toBeInTheDocument();
    expect(screen.queryByText(INCOMPLETE_NOTE)).not.toBeInTheDocument();
  });

  it('marks the total as incomplete when a source did not answer', async () => {
    renderWidget(chart({ completeness: 'partial' }));

    // The bars that did load are real and stay — next to the note that they
    // are not the whole history.
    expect(await screen.findByText(TOTAL)).toBeInTheDocument();
    expect(screen.getByTestId('reward-bars')).toBeInTheDocument();
    expect(screen.getByText(INCOMPLETE_NOTE)).toBeInTheDocument();
  });

  it('does not call an incomplete history with nothing in it "no rewards yet"', async () => {
    renderWidget(chart({ buckets: [], total: '0', hasData: false, completeness: 'partial' }));

    expect(await screen.findByText(INCOMPLETE_TITLE)).toBeInTheDocument();
    expect(screen.queryByText(NO_REWARDS)).not.toBeInTheDocument();
  });

  it('says the history could not be loaded instead of showing a zero total', async () => {
    renderWidget(chart({ buckets: [], total: '0', hasData: false, completeness: 'unavailable' }));

    expect(await screen.findByText(UNAVAILABLE_TITLE)).toBeInTheDocument();
    expect(screen.queryByText(NO_REWARDS)).not.toBeInTheDocument();
    expect(screen.queryByText(/^0(\.0+)?\s*DOT$/)).not.toBeInTheDocument();
  });

  it('keeps the empty state for a complete history with no rewards', async () => {
    renderWidget(chart({ buckets: [], total: '0', hasData: false }));

    expect(await screen.findByText(NO_REWARDS)).toBeInTheDocument();
    expect(screen.queryByText(UNAVAILABLE_TITLE)).not.toBeInTheDocument();
    expect(screen.queryByText(INCOMPLETE_TITLE)).not.toBeInTheDocument();
  });
});
