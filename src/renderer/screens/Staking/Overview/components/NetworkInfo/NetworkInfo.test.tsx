import { render, screen, act } from '@testing-library/react';
import noop from 'lodash/noop';

import NetworkInfo from './NetworkInfo';
import { Chain } from '@renderer/domain/chain';
import { TEST_ADDRESS } from '@renderer/shared/utils/constants';
import { useStakingRewards } from '@renderer/services/staking/stakingRewardsService';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string, params?: any) => `${key} ${params?.value || ''}`,
  }),
}));

jest.mock('@renderer/services/network/chainsService', () => ({
  useChains: jest.fn().mockReturnValue({
    sortChains: jest.fn((value: Chain[]) => value),
    getChainsData: jest.fn().mockResolvedValue([
      {
        chainId: '0x123',
        name: 'My test chain',
        addressPrefix: 0,
        assets: [{ symbol: 'WND', staking: 'relaychain', name: 'Westend' }],
      },
    ]),
  }),
}));

jest.mock('@renderer/services/settings/settingsStorage', () => ({
  useSettingsStorage: jest.fn().mockReturnValue({
    getStakingNetwork: jest.fn().mockReturnValue('0x123'),
  }),
}));

jest.mock('@renderer/services/staking/stakingRewardsService', () => ({
  useStakingRewards: jest.fn().mockReturnValue({
    rewards: {},
    isLoading: false,
  }),
}));

describe('screens/Staking/Overview/NetworkInfo', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should create component', async () => {
    await act(async () => {
      render(
        <NetworkInfo addresses={[TEST_ADDRESS]} totalStakes={['10000']} onNetworkChange={noop}>
          children
        </NetworkInfo>,
      );
    });

    const rewardsLabel = screen.getByText('staking.overview.totalRewardsLabel');
    const stakingLabel = screen.getByText('staking.overview.totalStakedLabel');
    const children = screen.queryByText('children');
    expect(rewardsLabel).toBeInTheDocument();
    expect(stakingLabel).toBeInTheDocument();
    expect(children).not.toBeInTheDocument();
  });

  test('should expand children', async () => {
    await act(async () => {
      render(
        <NetworkInfo totalStakes={[]} addresses={[]} onNetworkChange={noop}>
          children
        </NetworkInfo>,
      );
    });

    let children = screen.queryByText('children');
    expect(children).not.toBeInTheDocument();

    const button = screen.getAllByRole('button')[1];
    await act(async () => button.click());

    children = screen.getByText('children');
    expect(children).toBeInTheDocument();
  });

  test('should render loading state', async () => {
    (useStakingRewards as jest.Mock).mockReturnValue({
      rewards: {},
      isLoading: true,
    });
    await act(async () => {
      render(<NetworkInfo totalStakes={[]} addresses={[]} onNetworkChange={noop} />);
    });

    const balances = screen.queryByText('assetBalance.number');
    const shimmers = screen.getAllByTestId('total-loading');
    expect(balances).not.toBeInTheDocument();
    expect(shimmers).toHaveLength(2);
  });

  test('should render total values', async () => {
    const accounts = [TEST_ADDRESS, '5GmedEVixRJoE8TjMePLqz7DnnQG1d5517sXdiAvAF2t7EYW'];
    (useStakingRewards as jest.Mock).mockReturnValue({
      isLoading: false,
      rewards: {
        [accounts[0]]: '360854699511',
        [accounts[1]]: '519204699511',
      },
    });
    await act(async () => {
      render(
        <NetworkInfo totalStakes={['201494854699', '401494854699']} addresses={accounts} onNetworkChange={noop} />,
      );
    });

    const rewards = screen.getByText(/880.05/);
    const staking = screen.getByText(/602.98/);
    expect(rewards).toBeInTheDocument();
    expect(staking).toBeInTheDocument();
  });
});
