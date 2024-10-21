import { type ApiPromise } from '@polkadot/api';
import { render, screen } from '@testing-library/react';
import { act } from 'react-dom/test-utils';

import { type Asset, type Transaction } from '@/shared/core';

import { Fee } from './Fee';

jest.mock('@/shared/i18n', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

jest.mock('../FeeLoader/FeeLoader', () => ({
  FeeLoader: ({ fiatFlag }: any) => <div>{fiatFlag ? 'fiat' : 'crypto'}</div>,
}));

jest.mock('../../lib', () => ({
  transactionService: {
    getTransactionFee: jest.fn().mockResolvedValue('12'),
  },
}));

jest.mock('@/entities/asset', () => ({
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
