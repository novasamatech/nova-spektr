import { act, render, screen } from '@testing-library/react';

import AssetBalance from './AssetBalance';
import { Chain } from '@renderer/services/network/common/types';
import chains from '@renderer/services/network/common/chains.json';
import { TEST_PUBLIC_KEY } from '@renderer/services/balance/common/constants';

const testChain = chains[0] as Chain;
const testAsset = testChain.assets[0];

describe('screen/Balances/AssetBalance', () => {
  test('should render component', async () => {
    await act(async () => {
      render(
        <AssetBalance
          asset={testAsset}
          balance={{
            assetId: testAsset.assetId.toString(),
            chainId: testChain.chainId,
            publicKey: TEST_PUBLIC_KEY,
            free: '10',
            frozen: [
              {
                type: 'test',
                amount: '1',
              },
            ],
          }}
        />,
      );
    });

    const text = screen.getByTestId('balance');
    expect(text).toHaveTextContent('0.000000001 DOT');
  });

  test('should render component', async () => {
    await act(async () => {
      render(
        <AssetBalance
          asset={testAsset}
          balance={{
            assetId: testAsset.assetId.toString(),
            chainId: testChain.chainId,
            publicKey: TEST_PUBLIC_KEY,
            free: '10',
            frozen: [
              {
                type: 'test',
                amount: '1',
              },
              {
                type: 'test-2',
                amount: '1',
              },
            ],
          }}
        />,
      );
    });

    const row = screen.getByRole('button');

    await act(async () => {
      row.click();
    });

    const text = screen.getByTestId('transferable');
    expect(text).toHaveTextContent('0.0000000008 DOT');

    await act(async () => {
      row.click();
    });

    const textHidden = screen.queryByTestId('transferable');
    expect(textHidden).not.toBeInTheDocument();
  });
});

export {};
