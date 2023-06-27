import { render, screen, act } from '@testing-library/react';
import { ApiPromise } from '@polkadot/api';

import { Asset } from '@renderer/domain/asset';
import { Validator } from '@renderer/domain/validator';
import { AboutStaking } from './AboutStaking';

jest.mock('react-i18next', () => ({ Trans: (props: any) => props.i18nKey }));

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string, params?: any) => `${key} ${params?.value || ''}`,
  }),
}));

jest.mock('@renderer/services/staking/apyCalculator', () => ({
  getAvgApy: jest.fn().mockResolvedValue('3'),
}));

jest.mock('@renderer/services/staking/stakingDataService', () => ({
  useStakingData: jest.fn().mockReturnValue({
    getMinNominatorBond: jest.fn().mockResolvedValue('1000000000000'),
    getUnbondingPeriod: jest.fn().mockReturnValue('43200'),
    getTotalStaked: jest.fn().mockResolvedValue('1426779967698631237'),
  }),
}));

describe('screens/Staking/Overview/AboutStaking', () => {
  const api = { isConnected: true } as ApiPromise;
  const asset = { symbol: 'WND', precision: 12 } as Asset;
  const validators = [
    {
      address: '5CFPcUJgYgWryPaV1aYjSbTpbTLu42V32Ytw1L9rfoMAsfGh',
      apy: 16.35,
      commission: 0,
      ownStake: '17944547910486225',
      totalStake: '83926482052666309',
      nominators: [
        { who: '5ExuYYE7Qfq2BJYqUygBa8Nr2y1qemkuGwZHEuEujkqnL4Xs', value: '1862537980901951' },
        { who: '5EYCAe5ijiYfAXEth5DJGKSYWhFRhK2QoYXVewKGQGdF5gqd', value: '1222410000000000' },
      ],
    },
  ] as Validator[];

  test('should render component', async () => {
    await act(async () => {
      render(<AboutStaking validators={[]} />);
    });

    const text = screen.getByText('staking.about.aboutStakingTitle');
    expect(text).toBeInTheDocument();
  });

  test('should show loaders', async () => {
    await act(async () => {
      render(<AboutStaking validators={[]} />);
    });

    const loaders = screen.getAllByTestId('shimmer');
    expect(loaders).toHaveLength(4);
  });

  test('should show whole info', async () => {
    await act(async () => {
      render(<AboutStaking api={api} era={100} asset={asset} validators={validators} />);
    });

    const totalStaked = screen.getByText(/assetBalance.number 1.42M/);
    const minimumStake = screen.getByText('assetBalance.number 1');
    // const activeNominators = screen.getByText('2');
    const stakingPeriod = screen.getByText('staking.about.unlimitedLabel');
    const unstakingPeriod = screen.getByText('time.hours');
    expect(totalStaked).toBeInTheDocument();
    expect(minimumStake).toBeInTheDocument();
    // expect(activeNominators).toBeInTheDocument();
    expect(stakingPeriod).toBeInTheDocument();
    expect(unstakingPeriod).toBeInTheDocument();
  });
});
