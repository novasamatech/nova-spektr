import { render, screen } from '@testing-library/react';
import { act } from 'react-dom/test-utils';

import NetworkBalances from './NetworkBalances';
import { TEST_PUBLIC_KEY } from '@renderer/services/balance/common/constants';
import chains from '@renderer/services/network/common/chains.json';
import { Chain } from '@renderer/services/network/common/types';

const testChain = chains.find((chain) => chain.assets.length > 1) as Chain;
const testAsset = testChain.assets[0];
const testAsset2 = testChain.assets[0];

jest.mock('@renderer/services/balance/balanceService', () => ({
  useBalance: jest.fn().mockReturnValue({
    getLiveNetworkBalances: () => [
      {
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
      },
      {
        assetId: testAsset2.assetId.toString(),
        chainId: testChain.chainId,
        publicKey: TEST_PUBLIC_KEY,
        free: '100',
        frozen: [
          {
            type: 'test',
            amount: '1',
          },
        ],
      },
    ],
  }),
}));

jest.mock('./AssetBalance', () => () => <div>AssetBalance</div>);

describe('screen/Balances/NetworkBalances', () => {
  test('should render component', () => {
    render(<NetworkBalances chain={testChain} publicKey={TEST_PUBLIC_KEY} />);
    const text = screen.getByText(testChain.name);

    expect(text).toBeInTheDocument();
  });

  test('should render assets', () => {
    render(<NetworkBalances chain={testChain} publicKey={TEST_PUBLIC_KEY} />);

    const balances = screen.getAllByText('AssetBalance');

    expect(balances).toHaveLength(2);
  });

  test('should hide assets', async () => {
    render(<NetworkBalances chain={testChain} publicKey={TEST_PUBLIC_KEY} />);

    const balancesBefore = screen.queryAllByText('AssetBalance');
    expect(balancesBefore).toHaveLength(2);

    const button = screen.getByRole('button');
    await act(async () => {
      button.click();
    });

    const balancesAfter = screen.queryAllByText('AssetBalance');
    expect(balancesAfter).not.toBeInTheDocument();
  });
});
