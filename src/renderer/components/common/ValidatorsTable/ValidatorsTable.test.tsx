import { render, screen } from '@testing-library/react';

import { Asset } from '@renderer/domain/asset';
import { Validator } from '@renderer/domain/validator';
import { TEST_ADDRESS } from '@renderer/services/balance/common/constants';
import ValidatorsTable from './ValidatorsTable';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('components/common/ValidatorsTable', () => {
  const validators = [
    {
      chainId: '0x123',
      oversubscribed: true,
      blocked: true,
      slashed: true,
      commission: 10,
      address: TEST_ADDRESS,
      apy: 50.87,
      ownStake: '23611437564986527',
      totalStake: '23728297476615343',
      identity: {
        subName: 'subName',
        parent: { name: 'parent', address: '0x123' },
      },
    },
  ] as unknown as Validator[];

  const asset = {
    assetId: 0,
    symbol: 'WND',
    precision: 12,
    staking: 'relaychain',
  } as Asset;

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should render component', async () => {
    render(<ValidatorsTable validators={validators} columns={['ownStake', 'totalStake']} asset={asset} />);

    const table = screen.getByRole('table');
    const identity = screen.getByText('parent/subName');
    const stakes = screen.getAllByText('assetBalance.number');
    expect(table).toBeInTheDocument();
    expect(identity).toBeInTheDocument();
    expect(stakes).toHaveLength(2);
  });

  test('should render loading', () => {
    render(<ValidatorsTable validators={validators} dataIsLoading />);

    const table = screen.getByRole('table');
    const rows = screen.getAllByRole('row');
    expect(table).toBeInTheDocument();
    expect(rows).toHaveLength(11);
  });

  test('should render without header', () => {
    render(<ValidatorsTable validators={validators} showHeader={false} />);

    const table = screen.getByRole('table');
    const groups = screen.getAllByRole('rowgroup');
    expect(table).toBeInTheDocument();
    expect(groups).toHaveLength(2);
    expect(groups[0]).toHaveClass('hidden');
  });
});
