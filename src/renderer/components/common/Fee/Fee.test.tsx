import { ApiPromise } from '@polkadot/api';
import { act, render, screen, waitFor } from '@testing-library/react';

import { Balance } from '@renderer/components/ui';
import { Asset } from '@renderer/domain/asset';
import { Transaction } from '@renderer/domain/transaction';
import { useTransaction } from '@renderer/services/transaction/transactionService';
import Fee from './Fee';

jest.mock('@renderer/components/ui');

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

jest.mock('@renderer/services/transaction/transactionService', () => ({
  useTransaction: jest.fn().mockReturnValue({
    getTransactionFee: jest.fn().mockResolvedValue('12'),
  }),
}));

describe('components/common/Fee', () => {
  beforeAll(() => {
    (Balance as jest.Mock).mockImplementation(({ value }: any) => <p>{value}</p>);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should render component', async () => {
    const asset = { symbol: 'DOT', precision: 10 } as Asset;
    const tx = { address: '0x123', args: {} } as Transaction;

    await act(async () => {
      render(<Fee api={{} as ApiPromise} asset={asset} transaction={tx} />);
    });

    const value = screen.getByText('12');
    expect(value).toBeInTheDocument();
  });

  test('should render loading while getting value', async () => {
    const asset = { symbol: 'DOT', precision: 10 } as Asset;
    const tx = { address: '0x123', args: {} } as Transaction;

    (useTransaction as jest.Mock).mockImplementation(() => ({
      getTransactionFee: jest.fn().mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve('12'), 0);
        });
      }),
    }));

    await act(async () => {
      render(<Fee api={{} as ApiPromise} asset={asset} transaction={tx} />);
    });

    waitFor(() => {
      const value = screen.getByText('12');
      expect(value).toBeInTheDocument();
    });
  });
});
