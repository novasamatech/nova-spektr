import { act, render, screen } from '@testing-library/react';

import AssetBalance from './AssetBalance';
import { Chain } from '@renderer/services/network/common/types';
import { TEST_PUBLIC_KEY } from '@renderer/services/balance/common/constants';
import chains from '@renderer/services/network/common/chains.json';

const testChain = chains[0] as Chain;
const testAsset = testChain.assets[0];

jest.mock('@renderer/services/balance/balanceService', () => ({
  useBalance: jest.fn(() => ({
    getLiveBalance: () => ({
      free: 100,
      frozen: 10,
    }),
  })),
}));

describe('screen/Balances/AssetBalance', () => {
  test('should render component', async () => {
    await act(async () => {
      render(<AssetBalance asset={testAsset} chain={testChain} publicKey={TEST_PUBLIC_KEY} />);
    });

    const text = screen.getByTestId('balance');
    expect(text).toHaveTextContent('0.000000009 DOT');
  });
});

export {};
