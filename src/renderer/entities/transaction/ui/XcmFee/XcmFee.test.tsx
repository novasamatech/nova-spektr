import { act, render, screen } from '@testing-library/react';
import { ApiPromise } from '@polkadot/api';

import { Transaction } from '@entities/transaction';
import { XcmFee } from './XcmFee';
import { ChainXCM, XcmConfig } from '@shared/api/xcm';
import type { Asset } from '@shared/core';

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

describe('entities/transaction/ui/XcmFee', () => {
  test('should render component', async () => {
    const asset = { symbol: 'DOT', precision: 10 } as Asset;
    const tx = {
      address: '0x123',
      chainId: '0x00',
      type: 'xcm_limited_teleport_assets',
      args: {
        destinationChain: '0x00',
      },
    } as Transaction;

    await act(async () => {
      render(
        <XcmFee
          api={{} as ApiPromise}
          config={{ chains: [] as ChainXCM[] } as XcmConfig}
          asset={asset}
          transaction={tx}
        />,
      );
    });

    const value = screen.getByText('0');
    expect(value).toBeInTheDocument();
  });
});
