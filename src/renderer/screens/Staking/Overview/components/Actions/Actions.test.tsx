import { render, screen } from '@testing-library/react';
import noop from 'lodash/noop';

import Actions from './Actions';
import { Stake } from '@renderer/domain/stake';
import { TEST_ADDRESS } from '@renderer/shared/utils/constants';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));
describe('screens/Staking/Overview/Actions', () => {
  const stakes: Stake[] = [
    {
      active: '1660129379444',
      address: TEST_ADDRESS,
      chainId: '0x123',
      controller: TEST_ADDRESS,
      stash: TEST_ADDRESS,
      total: '1900129379444',
      unlocking: [],
    },
  ];

  test('should create component', () => {
    render(<Actions stakes={stakes} onNavigate={noop} />);

    const accounts = screen.getByText('staking.overview.actionsTitle');
    expect(accounts).toBeInTheDocument();
  });

  // test('should render actions for existing stake', () => {
  //   const stakes = [
  //     {
  //       accountId: TEST_ADDRESS,
  //       active: '750000000000',
  //       total: '950000000000',
  //       unlocking: [{ value: '15000000000', era: '1000' }],
  //     },
  //   ] as unknown as Stake[];
  //   render(<StakingActions stakes={stakes} onNavigate={() => {}} />);
  //
  //   const actions = screen.getAllByRole('button');
  //   expect(actions).toHaveLength(6);
  // });
  //
  // test('should render actions for overlapping stake', () => {
  //   const stakes = [
  //     {
  //       accountId: TEST_ADDRESS,
  //       active: '1050000000000',
  //       total: '1050000000000',
  //       unlocking: [],
  //     },
  //     {
  //       accountId: '133khBTmxKsWJ6kyybChNadTHyy1kDmpStWNCiEiSdDMAZwS',
  //       active: '750000000000',
  //       total: '950000000000',
  //       unlocking: [{ value: '15000000000', era: '1000' }],
  //     },
  //   ] as unknown as Stake[];
  //   render(<StakingActions stakes={stakes} onNavigate={() => {}} />);
  //
  //   const actions = screen.getAllByRole('button');
  //   expect(actions).toHaveLength(4);
  // });
  //
  // test('should render actions for not overlapping stake', () => {
  //   const stakes = [
  //     { accountId: TEST_ADDRESS },
  //     {
  //       accountId: '133khBTmxKsWJ6kyybChNadTHyy1kDmpStWNCiEiSdDMAZwS',
  //       active: '750000000000',
  //       total: '950000000000',
  //       unlocking: [{ value: '15000000000', era: '1000' }],
  //     },
  //   ] as unknown as Stake[];
  //   render(<StakingActions stakes={stakes} onNavigate={() => {}} />);
  //
  //   const actions = screen.queryByRole('button');
  //   expect(actions).not.toBeInTheDocument();
  // });
});
