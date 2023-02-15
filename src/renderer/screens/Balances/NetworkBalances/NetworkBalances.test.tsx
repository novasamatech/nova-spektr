import { act, render, screen } from '@testing-library/react';

import NetworkBalances from './NetworkBalances';
import { Chain } from '@renderer/domain/chain';
import { TEST_PUBLIC_KEY } from '@renderer/shared/utils/constants';
import chains from '@renderer/services/network/common/chains/chains.json';

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
        frozen: [{ type: 'test', amount: '1' }],
      },
      {
        assetId: testAsset2.assetId.toString(),
        chainId: testChain.chainId,
        publicKey: TEST_PUBLIC_KEY,
        free: '100',
        frozen: [{ type: 'test', amount: '1' }],
        verified: false,
      },
    ],
  }),
}));

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

jest.mock('../AssetBalance/AssetBalance', () => () => <div>AssetBalance</div>);

describe('screen/Balances/NetworkBalances', () => {
  test('should render component', () => {
    render(<NetworkBalances chain={testChain} publicKeys={[TEST_PUBLIC_KEY]} />);

    const text = screen.getByText(testChain.name);
    expect(text).toBeInTheDocument();
  });

  test('should render assets', () => {
    render(<NetworkBalances chain={testChain} publicKeys={[TEST_PUBLIC_KEY]} />);

    const balances = screen.getAllByText('AssetBalance');
    expect(balances).toHaveLength(2);
  });

  test('should hide assets', async () => {
    render(<NetworkBalances chain={testChain} publicKeys={[TEST_PUBLIC_KEY]} />);

    const balancesBefore = screen.getAllByText('AssetBalance');
    expect(balancesBefore).toHaveLength(2);

    const button = screen.getByRole('button');
    await act(() => button.click());

    const balancesAfter = screen.queryByText('AssetBalance');
    expect(balancesAfter).not.toBeInTheDocument();
  });

  test('should show unverfied badge', () => {
    render(<NetworkBalances chain={testChain} publicKeys={[TEST_PUBLIC_KEY]} />);

    const unverifiedBadge = screen.getByText('balances.verificationFailedLabel');
    expect(unverifiedBadge).toBeInTheDocument();
  });
});
