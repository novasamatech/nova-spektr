import { ApiPromise } from '@polkadot/api';
import { act, render, screen } from '@testing-library/react';

import { Transaction } from '@entities/transaction';
import type { Asset } from '@shared/core';
import { Fee } from './Fee';

jest.mock('@renderer/components/common');

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

jest.mock('@entities/asset', () => ({
  ...jest.requireActual('@entities/asset'),
  AssetBalance: ({ value }: any) => <div>{value}</div>,
}));

describe('components/common/Fee', () => {
  test('should render component', async () => {
    const asset = { symbol: 'DOT', precision: 10 } as Asset;
    const tx = { address: '0x123', args: {} } as Transaction;

    await act(async () => {
      render(<Fee api={{} as ApiPromise} asset={asset} transaction={tx} />);
    });

    const value = screen.getByText('12');
    expect(value).toBeInTheDocument();
  });

  // TODO: Rework this test
  // test.skip('should render loading while getting value', async () => {
  //   const asset = { symbol: 'DOT', precision: 10 } as Asset;
  //   const tx = { address: '0x123', args: {} } as Transaction;
  //
  //   (useTransaction as jest.Mock).mockImplementation(() => ({
  //     getTransactionFee: jest.fn().mockImplementation(() => {
  //       return new Promise((resolve) => {
  //         setTimeout(() => resolve('12'), 0);
  //       });
  //     }),
  //   }));
  //
  //   await act(async () => {
  //     render(<Fee api={{} as ApiPromise} asset={asset} transaction={tx} />);
  //   });
  //
  //   // const loader = screen.getByTestId('fee-loader');
  //   // expect(loader).toBeInTheDocument();
  //
  //   waitFor(() => {
  //     const value = screen.getByText('12');
  //     expect(value).toBeInTheDocument();
  //   });
  // });
});
