import { ApiPromise } from '@polkadot/api';
import { act, render, screen } from '@testing-library/react';

import { Deposit } from './Deposit';
import type { Asset } from '@renderer/shared/core';

jest.mock('@renderer/components/common');

jest.mock('@renderer/app/providers', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

jest.mock('@renderer/entities/transaction', () => ({
  useTransaction: jest.fn().mockReturnValue({
    getTransactionDeposit: jest.fn().mockReturnValue('46'),
  }),
}));

jest.mock('@renderer/entities/asset', () => ({
  ...jest.requireActual('@renderer/entities/asset'),
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
