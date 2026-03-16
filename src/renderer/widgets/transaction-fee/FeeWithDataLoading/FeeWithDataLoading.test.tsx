import { type ApiPromise } from '@polkadot/api';
import { act, render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import { type Asset, type Transaction } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';

import { FeeWithDataLoading } from './FeeWithDataLoading';

vi.mock('@/shared/i18n', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

vi.mock('../FeeLoader/FeeLoader', () => ({
  FeeLoader: ({ fiatFlag }: any) => <div>{fiatFlag ? 'fiat' : 'crypto'}</div>,
}));

vi.mock('@/entities/transaction', () => ({
  transactionService: {
    getTransactionFee: jest.fn().mockResolvedValue('12'),
  },
}));

vi.mock('@/shared/ui-entities', () => ({
  AssetBalance: ({ value }: any) => <div>{value}</div>,
}));

describe('widgets/transaction-fee/FeeWithDataLoading', () => {
  test('should render component', async () => {
    const asset = { symbol: 'DOT', precision: 10 } as Asset;
    const tx = { accountId: '0x123' as AccountId, args: {} } as Transaction;
    const api = { isReady: Promise.resolve().then(() => api) } as ApiPromise;

    await act(async () => {
      render(<FeeWithDataLoading api={api} asset={asset} transaction={tx} />);
    });

    const value = screen.getByText('12');
    expect(value).toBeInTheDocument();
  });
});
