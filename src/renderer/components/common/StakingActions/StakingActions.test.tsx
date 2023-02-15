import { render, screen } from '@testing-library/react';

import { Stake } from '@renderer/domain/stake';
import { TEST_ADDRESS } from '@renderer/shared/utils/constants';
import StakingActions from './StakingActions';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('components/common/StakingActions', () => {
  test('should render component', () => {
    const stakes = [{ accountId: TEST_ADDRESS }] as Stake[];
    render(<StakingActions stakes={stakes} onNavigate={() => {}} />);

    const actions = screen.getByRole('button');
    expect(actions).toBeInTheDocument();
  });

  test('should render actions for existing stake', () => {
    const stakes = [
      {
        accountId: TEST_ADDRESS,
        active: '750000000000',
        total: '950000000000',
        unlocking: [{ value: '15000000000', era: '1000' }],
      },
    ] as unknown as Stake[];
    render(<StakingActions stakes={stakes} onNavigate={() => {}} />);

    const actions = screen.getAllByRole('button');
    expect(actions).toHaveLength(6);
  });

  test('should render actions for overlapping stake', () => {
    const stakes = [
      {
        accountId: TEST_ADDRESS,
        active: '1050000000000',
        total: '1050000000000',
        unlocking: [],
      },
      {
        accountId: '133khBTmxKsWJ6kyybChNadTHyy1kDmpStWNCiEiSdDMAZwS',
        active: '750000000000',
        total: '950000000000',
        unlocking: [{ value: '15000000000', era: '1000' }],
      },
    ] as unknown as Stake[];
    render(<StakingActions stakes={stakes} onNavigate={() => {}} />);

    const actions = screen.getAllByRole('button');
    expect(actions).toHaveLength(4);
  });

  test('should render actions for not overlapping stake', () => {
    const stakes = [
      { accountId: TEST_ADDRESS },
      {
        accountId: '133khBTmxKsWJ6kyybChNadTHyy1kDmpStWNCiEiSdDMAZwS',
        active: '750000000000',
        total: '950000000000',
        unlocking: [{ value: '15000000000', era: '1000' }],
      },
    ] as unknown as Stake[];
    render(<StakingActions stakes={stakes} onNavigate={() => {}} />);

    const actions = screen.queryByRole('button');
    expect(actions).not.toBeInTheDocument();
  });
});
