import { act, render, screen } from '@testing-library/react';

import { Transaction } from '@renderer/entities/transaction';
import { XcmFee } from './XcmFee';
import { ChainXCM, XcmConfig } from '@renderer/shared/api/xcm';
import type { Asset } from '@renderer/shared/core';

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
    const tx = {
      address: '0x123',
      chainId: '0x00',
      type: 'xcm_limited_teleport_assets',
      args: {
        destinationChain: '0x00',
      },
    } as Transaction;

    await act(async () => {
      render(<XcmFee config={{ chains: [] as ChainXCM[] } as XcmConfig} asset={asset} transaction={tx} />);
    });

    const value = screen.getByText('0');
    expect(value).toBeInTheDocument();
  });
});
