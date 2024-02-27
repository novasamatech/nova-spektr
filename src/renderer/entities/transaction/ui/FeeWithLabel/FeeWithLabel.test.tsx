import { ApiPromise } from '@polkadot/api';
import { render, screen, act } from '@testing-library/react';

import { FeeWithLabel } from './FeeWithLabel';
import type { Asset } from '@shared/core';
import { Transaction } from '../../model/transaction';

jest.mock('@app/providers', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

jest.mock('@entities/transaction', () => ({
  useTransaction: jest.fn().mockReturnValue({
    getTransactionFee: jest.fn().mockResolvedValue('12'),
  }),
}));

jest.mock('@entities/asset', () => ({ AssetBalance: ({ value }: any) => <div>{value}</div> }));

describe('entities/transaction/ui/FeeWithLabel', () => {
  test('should render component', async () => {
    const asset = { symbol: 'DOT', precision: 10 } as Asset;
    const tx = { address: '0x123', args: {} } as Transaction;

    await act(async () => {
      render(<FeeWithLabel api={{} as ApiPromise} asset={asset} transaction={tx} />);
    });

    const value = screen.getByText('12');
    expect(value).toBeInTheDocument();
  });
});
