import { render, screen, act } from '@testing-library/react';
import noop from 'lodash/noop';

import { Stake } from '@renderer/entities/staking';
import { TEST_ADDRESS } from '@renderer/shared/lib/utils';
import { Actions } from './Actions';

jest.mock('@renderer/app/providers', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('pages/Staking/Overview/Actions', () => {
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

  const renderActions = async (stakes: Stake[], canInteract = true) => {
    render(<Actions canInteract={canInteract} isStakingLoading={false} stakes={stakes} onNavigate={noop} />);

    const button = screen.getByRole('button');
    await act(() => button.click());
  };

  test('should render component', () => {
    render(<Actions canInteract isStakingLoading={false} stakes={stakes} onNavigate={noop} />);

    const accounts = screen.getByText('staking.overview.actionsTitle');
    expect(accounts).toBeInTheDocument();
  });

  test('should not render action button', () => {
    render(<Actions canInteract={false} isStakingLoading={false} stakes={stakes} onNavigate={noop} />);

    const actionButton = screen.queryByRole('button');
    expect(actionButton).not.toBeInTheDocument();
  });

  test('should render actions for existing stake', async () => {
    const stakes = [
      {
        address: TEST_ADDRESS,
        active: '750000000000',
        total: '950000000000',
        unlocking: [{ value: '15000000000', era: '1000' }],
      },
    ] as unknown as Stake[];

    await renderActions(stakes);

    const actions = screen.getAllByRole('menuitem');
    expect(actions).toHaveLength(6);
  });

  test('should render actions for overlapping stake', async () => {
    const stakes = [
      {
        address: TEST_ADDRESS,
        active: '1050000000000',
        total: '1050000000000',
        unlocking: [],
      },
      {
        address: '133khBTmxKsWJ6kyybChNadTHyy1kDmpStWNCiEiSdDMAZwS',
        active: '750000000000',
        total: '950000000000',
        unlocking: [{ value: '15000000000', era: '1000' }],
      },
    ] as unknown as Stake[];

    await renderActions(stakes);

    const actions = screen.getAllByRole('menuitem');
    expect(actions).toHaveLength(4);
  });

  test('should render actions for not overlapping stake', async () => {
    const stakes = [
      { address: TEST_ADDRESS },
      {
        address: '133khBTmxKsWJ6kyybChNadTHyy1kDmpStWNCiEiSdDMAZwS',
        active: '750000000000',
        total: '950000000000',
        unlocking: [{ value: '15000000000', era: '1000' }],
      },
    ] as unknown as Stake[];

    await renderActions(stakes);

    const actions = screen.queryByRole('menuitem');
    expect(actions).not.toBeInTheDocument();
  });
});
