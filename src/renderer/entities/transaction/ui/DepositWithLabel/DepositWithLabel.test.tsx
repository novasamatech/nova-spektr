import { ApiPromise } from '@polkadot/api';
import { render, screen } from '@testing-library/react';

import { DepositWithLabel } from './DepositWithLabel';
import type { Asset } from '@shared/core';

jest.mock('@app/providers', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

jest.mock('@entities/transaction', () => ({
  useTransaction: jest.fn().mockReturnValue({
    getTransactionDeposit: jest.fn().mockReturnValue('46'),
  }),
}));

jest.mock('@entities/asset', () => ({ AssetBalance: () => <div>deposit_value</div> }));

describe('components/common/DepositWithLabel', () => {
  test('should render component', () => {
    const asset = { symbol: 'DOT', precision: 10 } as Asset;

    render(<DepositWithLabel api={{} as ApiPromise} asset={asset} threshold={3} />);

    const value = screen.getByText('deposit_value');
    expect(value).toBeInTheDocument();

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toBeInTheDocument();
  });
});
