import { render, screen, act } from '@testing-library/react';
import noop from 'lodash/noop';
import { ApiPromise } from '@polkadot/api';

import { ValidatorMap, useValidators } from '@renderer/entities/staking';
import { ValidatorsModal } from './ValidatorsModal';

jest.mock('@renderer/components/common');

jest.mock('@renderer/app/providers', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

jest.mock('@renderer/services/staking/validatorsService', () => ({
  useValidators: jest.fn().mockReturnValue({
    getNominators: jest.fn().mockResolvedValue({}),
  }),
}));

describe('screens/Staking/Overview/ValidatorsModal', () => {
  const api = { isConnected: true } as ApiPromise;

  const elected = {
    '0x123': {
      address: '0x123',
      identity: {
        subName: 'subName',
        parent: { name: 'parent', address: '0x098' },
      },
    },
  } as unknown as ValidatorMap;

  const notElected = {
    '0x777': {
      address: '0x777',
      identity: {
        subName: 'subName',
        parent: { name: 'parent', address: '0x456' },
      },
    },
  } as unknown as ValidatorMap;

  test('should render no results', async () => {
    await act(async () => {
      render(<ValidatorsModal isOpen stash="0x555" api={api} validators={{}} onClose={noop} />);
    });

    const label = screen.getByText('staking.overview.noValidatorsLabel');
    expect(label).toBeInTheDocument();
  });

  test('should render elected validators', async () => {
    (useValidators as jest.Mock).mockReturnValue({
      getNominators: jest.fn().mockResolvedValue(elected),
    });

    await act(async () => {
      render(<ValidatorsModal isOpen stash="0x555" api={api} validators={elected} onClose={noop} />);
    });

    const title = screen.getByText('staking.nominators.yourValidatorsTitle');
    const electedBlock = screen.getByText('staking.nominators.electedTitle');
    const notElectedBlock = screen.queryByText('staking.nominators.notElectedTitle');
    expect(title).toBeInTheDocument();
    expect(electedBlock).toBeInTheDocument();
    expect(notElectedBlock).not.toBeInTheDocument();
  });

  test('should render not elected data', async () => {
    (useValidators as jest.Mock).mockReturnValue({
      getNominators: jest.fn().mockResolvedValue(notElected),
    });

    await act(async () => {
      render(<ValidatorsModal isOpen stash="0x555" api={api} validators={elected} onClose={noop} />);
    });

    const title = screen.getByText('staking.nominators.yourValidatorsTitle');
    const electedBlock = screen.queryByText('staking.nominators.electedTitle');
    const notElectedBlock = screen.getByText('staking.nominators.notElectedTitle');
    expect(title).toBeInTheDocument();
    expect(electedBlock).not.toBeInTheDocument();
    expect(notElectedBlock).toBeInTheDocument();
  });
});
