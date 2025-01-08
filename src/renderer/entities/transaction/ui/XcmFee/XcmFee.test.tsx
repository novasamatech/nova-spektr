import { type ApiPromise } from '@polkadot/api';
import { act, render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import { type ChainXCM, type XcmConfig } from '@/shared/api/xcm';
import { type Asset, type Transaction } from '@/shared/core';

import { XcmFee } from './XcmFee';

vi.mock('@/shared/i18n', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

vi.mock('@/entities/transaction', () => ({
  useTransaction: jest.fn().mockReturnValue({
    getTransactionFee: jest.fn().mockResolvedValue('12'),
  }),
}));

vi.mock('@/entities/asset/ui', () => ({
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
