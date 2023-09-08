import { ApiPromise } from '@polkadot/api';
import { act, render, screen } from '@testing-library/react';

import { Asset } from '@renderer/entities/asset';
import { Transaction } from '@renderer/entities/transaction';
import { XcmFee } from './XcmFee';
import { XcmConfig } from '@renderer/shared/api/xcm';

jest.mock('@renderer/components/common');

jest.mock('@renderer/app/providers', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

jest.mock('@renderer/entities/transaction', () => ({
  useTransaction: jest.fn().mockReturnValue({
    getTransactionFee: jest.fn().mockResolvedValue('12'),
  }),
}));

jest.mock('@renderer/entities/asset', () => ({
  ...jest.requireActual('@renderer/entities/asset'),
  AssetBalance: ({ value }: any) => <div>{value}</div>,
}));

describe('components/common/XcmFee', () => {
  test('should render component', async () => {
    const asset = { symbol: 'DOT', precision: 10 } as Asset;
    const tx = { address: '0x123', args: {} } as Transaction;

    await act(async () => {
      render(<XcmFee config={{} as XcmConfig} api={{} as ApiPromise} asset={asset} transaction={tx} />);
    });

    const value = screen.getByText('12');
    expect(value).toBeInTheDocument();
  });
});
