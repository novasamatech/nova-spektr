import { render, screen, act } from '@testing-library/react';
import noop from 'lodash/noop';

import { NetworkInfo } from './NetworkInfo';
import { useSettingsStorage } from '@entities/settings';
import type { Chain } from '@shared/core';

jest.mock('@app/providers', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string, params?: any) => `${key} ${params?.value || ''}`,
  }),
}));

jest.mock('@shared/api/network', () => ({
  chainsService: {
    sortChains: jest.fn((value: Chain[]) => value),
    getChainsData: jest.fn().mockReturnValue([
      {
        chainId: '0x123',
        name: 'WND chain',
        addressPrefix: 42,
        assets: [{ symbol: 'WND', staking: 'relaychain', name: 'Westend' }],
      },
      {
        chainId: '0x567',
        name: 'DOT chain',
        addressPrefix: 0,
        assets: [{ symbol: 'DOT', staking: 'relaychain', name: 'Polkadot' }],
      },
    ]),
  },
}));

jest.mock('@entities/settings', () => ({
  useSettingsStorage: jest.fn().mockReturnValue({
    getStakingNetwork: jest.fn().mockReturnValue('0x123'),
    setStakingNetwork: jest.fn(),
  }),
}));

describe('pages/Staking/Overview/NetworkInfo', () => {
  const defaultProps = {
    isRewardsLoading: false,
    isStakingLoading: false,
    rewards: [],
    totalStakes: [],
    onNetworkChange: noop,
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should render component', async () => {
    await act(async () => {
      render(
        <NetworkInfo {...defaultProps} totalStakes={['10000']}>
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
        <NetworkInfo {...defaultProps} rewards={['100', '200']}>
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
    await act(async () => {
      render(<NetworkInfo {...defaultProps} isRewardsLoading={true} isStakingLoading={true} />);
    });

    const balances = screen.queryAllByText('assetBalance.number');
    const shimmers = screen.getAllByTestId('value-loading');
    expect(balances.length).toEqual(0);
    expect(shimmers).toHaveLength(2);
  });

  test('should render total values', async () => {
    await act(async () => {
      render(
        <NetworkInfo
          {...defaultProps}
          rewards={['360854699511', '519204699511']}
          totalStakes={['201494854699', '401494854699']}
        />,
      );
    });

    const rewards = screen.getByText(/880.05/);
    const staking = screen.getByText(/602.98/);
    expect(rewards).toBeInTheDocument();
    expect(staking).toBeInTheDocument();
  });

  test('should save staking network', async () => {
    const spyGet = jest.fn();
    const spySet = jest.fn();

    (useSettingsStorage as jest.Mock).mockImplementation(() => ({
      getStakingNetwork: spyGet,
      setStakingNetwork: spySet,
    }));

    await act(async () => {
      render(<NetworkInfo {...defaultProps} />);
    });

    expect(spyGet).toHaveBeenCalled();

    const button = screen.getByText('WND chain');
    await act(async () => button.click());

    const dotButton = screen.getByText('DOT chain');
    dotButton.click();

    expect(spySet).toBeCalledWith('0x567');
  });
});
