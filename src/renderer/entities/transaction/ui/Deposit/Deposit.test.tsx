import { ApiPromise } from '@polkadot/api';
import { act, render, screen } from '@testing-library/react';

import { Deposit } from './Deposit';
import type { Asset } from '@shared/core';

jest.mock('@renderer/components/common');

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

jest.mock('@entities/asset', () => ({
  ...jest.requireActual('@entities/asset'),
  AssetBalance: ({ value }: any) => <div>{value}</div>,
}));

describe('components/common/Deposit', () => {
  test('should render component', async () => {
    const asset = { symbol: 'DOT', precision: 10 } as Asset;

    await act(async () => {
      render(<Deposit api={{} as ApiPromise} asset={asset} threshold={3} />);
    });

    const value = screen.getByText('46');
    expect(value).toBeInTheDocument();
  });
});
