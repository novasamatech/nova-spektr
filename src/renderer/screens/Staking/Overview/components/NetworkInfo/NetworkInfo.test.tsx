import { render, screen, act } from '@testing-library/react';
import noop from 'lodash/noop';

import NetworkInfo from './NetworkInfo';
import { Chain } from '@renderer/domain/chain';

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

describe('screens/Staking/Overview/NetworkInfo', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should create component', async () => {
    await act(async () => {
      render(
        <NetworkInfo
          isRewardsLoading={false}
          isStakingLoading={false}
          rewards={[]}
          totalStakes={['10000']}
          onNetworkChange={noop}
        >
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
        <NetworkInfo
          isRewardsLoading={false}
          isStakingLoading={false}
          rewards={['100', '200']}
          totalStakes={[]}
          onNetworkChange={noop}
        >
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
      render(
        <NetworkInfo
          isRewardsLoading={true}
          isStakingLoading={true}
          rewards={[]}
          totalStakes={[]}
          onNetworkChange={noop}
        />,
      );
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
          isRewardsLoading={false}
          isStakingLoading={false}
          rewards={['360854699511', '519204699511']}
          totalStakes={['201494854699', '401494854699']}
          onNetworkChange={noop}
        />,
      );
    });

    const rewards = screen.getByText(/880.05/);
    const staking = screen.getByText(/602.98/);
    expect(rewards).toBeInTheDocument();
    expect(staking).toBeInTheDocument();
  });
});
