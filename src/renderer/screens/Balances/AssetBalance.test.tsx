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
            free: '1',
            frozen: [],
          }}
        />,
      );
    });

    const text = screen.getByTestId('balance');
    expect(text).toHaveTextContent('0.0000000001 DOT');
  });
});

export {};
