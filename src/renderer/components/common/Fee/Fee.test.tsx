import { ApiPromise } from '@polkadot/api';
import { render, screen } from '@testing-library/react';

import { Asset } from '@renderer/domain/asset';
import { Transaction } from '@renderer/domain/transaction';
import Fee from './Fee';

jest.mock('@renderer/services/transaction/transactionService', () => ({
  useTransaction: jest.fn().mockReturnValue({
    getTransactionFee: jest.fn(),
  }),
}));

describe('Fee', () => {
  // TODO: fix test
  test('should render component', () => {
    const api = {} as ApiPromise;
    const asset = { symbol: 'DOT', precision: 10 } as Asset;
    const tx = {
      type: 'transfer',
      chainId: '0x123',
      address: '111',
      args: { value: 100, dest: '222' },
    } as Transaction;

    // @ts-ignore
    render(<Fee api={api} asset={asset} accountId="123" addressPrefix={0} transaction={tx} />);

    const logo = screen.getByTestId('logo-img');
    expect(logo).toBeInTheDocument();
  });
});
