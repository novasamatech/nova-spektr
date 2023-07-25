import { ApiPromise } from '@polkadot/api';
import { render, screen } from '@testing-library/react';

import { Asset } from '@renderer/entities/asset/model/asset';
import { DepositWithLabel } from './DepositWithLabel';

jest.mock('@renderer/app/providers', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

jest.mock('@renderer/services/transaction/transactionService', () => ({
  useTransaction: jest.fn().mockReturnValue({
    getTransactionDeposit: jest.fn().mockReturnValue('46'),
  }),
}));

jest.mock('@renderer/components/common/BalanceNew/BalanceNew', () => () => <div>deposit_value</div>);

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
