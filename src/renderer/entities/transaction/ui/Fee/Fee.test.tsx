import { ApiPromise } from '@polkadot/api';
import { act, render, screen } from '@testing-library/react';

import { Transaction } from '@entities/transaction';
import type { Asset } from '@shared/core';
import { Fee } from './Fee';

jest.mock('@app/providers', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

jest.mock('@entities/transaction', () => ({
  transactionService: {
    getTransactionFee: jest.fn().mockResolvedValue('12'),
  },
  FeeLoader: ({ fiatFlag }: any) => <div>{fiatFlag ? 'fiat' : 'crypto'}</div>,
}));

jest.mock('@entities/asset', () => ({
  AssetBalance: ({ value }: any) => <div>{value}</div>,
}));

describe('entities/transaction/ui/Fee', () => {
  test('should render component', async () => {
    const asset = { symbol: 'DOT', precision: 10 } as Asset;
    const tx = { address: '0x123', args: {} } as Transaction;

    await act(async () => {
      render(<Fee api={{} as ApiPromise} asset={asset} transaction={tx} />);
    });

    const value = screen.getByText('12');
    expect(value).toBeInTheDocument();
  });
});
