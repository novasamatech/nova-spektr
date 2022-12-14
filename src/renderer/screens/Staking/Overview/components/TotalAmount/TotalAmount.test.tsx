import { render, screen } from '@testing-library/react';

import { Asset } from '@renderer/domain/asset';
import { TEST_ADDRESS } from '@renderer/services/balance/common/constants';
import { useStakingRewards } from '@renderer/services/staking/stakingRewardsService';
import TotalAmount from './TotalAmount';

jest.mock('@renderer/services/staking/stakingRewardsService', () => ({
  useStakingRewards: jest.fn().mockReturnValue({
    rewards: {},
    isLoading: false,
  }),
}));

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string, params?: any) => `${key} ${params?.value || ''}`,
  }),
}));

describe('screens/Staking/Overview/TotalAmount', () => {
  const asset = { symbol: 'WND', precision: 12 } as Asset;

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should render component', () => {
    render(<TotalAmount totalStakes={['0']} accounts={[TEST_ADDRESS]} asset={asset} />);

    const rewardsLabel = screen.getByText('staking.overview.totalStakedLabel');
    const stakingLabel = screen.getByText('staking.overview.totalStakedLabel');
    expect(rewardsLabel).toBeInTheDocument();
    expect(stakingLabel).toBeInTheDocument();
  });

  test('should render loading state', () => {
    (useStakingRewards as jest.Mock).mockReturnValue({
      rewards: {},
      isLoading: true,
    });
    render(<TotalAmount totalStakes={[]} accounts={[TEST_ADDRESS]} asset={asset} />);

    const balances = screen.queryByText('assetBalance.number');
    const shimmers = screen.getAllByTestId('total-loading');
    expect(balances).not.toBeInTheDocument();
    expect(shimmers).toHaveLength(2);
  });

  test('should render total values', () => {
    (useStakingRewards as jest.Mock).mockReturnValue({
      rewards: { [TEST_ADDRESS]: '360854699511' },
      isLoading: false,
    });
    render(<TotalAmount totalStakes={['201494854699000']} accounts={[TEST_ADDRESS]} asset={asset} />);

    const rewards = screen.getByText(/0.36085/);
    const staking = screen.getByText(/201.49/);
    expect(rewards).toBeInTheDocument();
    expect(staking).toBeInTheDocument();
  });
});
