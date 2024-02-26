import { ApiPromise } from '@polkadot/api';
import { act, render, screen } from '@testing-library/react';

import { MultisigDeposit } from './MultisigDeposit';
import type { Asset } from '@shared/core';

jest.mock('@entities/transaction', () => ({
  useTransaction: jest.fn().mockReturnValue({
    getMultisigDeposit: jest.fn().mockReturnValue('46'),
  }),
}));

jest.mock('@entities/asset', () => ({
  ...jest.requireActual('@entities/asset'),
  AssetBalance: ({ value }: any) => <div>{value}</div>,
}));

describe('entities/transaction/ui/MultisigDeposit', () => {
  test('should render component', async () => {
    const asset = { symbol: 'DOT', precision: 10 } as Asset;

    await act(async () => {
      render(<MultisigDeposit api={{} as ApiPromise} asset={asset} threshold={3} />);
    });

    const value = screen.getByText('46');
    expect(value).toBeInTheDocument();
  });
});
