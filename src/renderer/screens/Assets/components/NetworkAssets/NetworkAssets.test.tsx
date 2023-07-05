import { act, render, screen } from '@testing-library/react';

import { Chain } from '@renderer/domain/chain';
import { TEST_ACCOUNT_ID } from '@renderer/shared/utils/constants';
import chains from '@renderer/services/network/common/chains/chains.json';
import { NetworkAssets } from './NetworkAssets';

const testChain = chains.find((chain) => chain.assets.length > 1) as Chain;
const testAsset = testChain.assets[0];
const testAsset2 = testChain.assets[1];

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

const testBalances = [
  {
    assetId: testAsset.assetId.toString(),
    chainId: testChain.chainId,
    accountId: TEST_ACCOUNT_ID,
    free: '10',
    frozen: [{ type: 'test', amount: '1' }],
  },
  {
    assetId: testAsset2.assetId.toString(),
    chainId: testChain.chainId,
    accountId: TEST_ACCOUNT_ID,
    free: '1000000000000',
    frozen: [{ type: 'test', amount: '1' }],
    // verified: false,
  },
];

jest.mock('@renderer/services/balance/balanceService', () => ({
  useBalance: jest.fn().mockReturnValue({
    getLiveNetworkBalances: () => testBalances,
  }),
}));

jest.mock('../AssetCard/AssetCard', () => ({
  AssetCard: ({ asset }: any) => <span data-testid="AssetCard">{asset.name}</span>,
}));

describe('screen/Assets/NetworkAssets', () => {
  test('should render component', () => {
    render(<NetworkAssets chain={testChain} accountIds={[TEST_ACCOUNT_ID]} />);

    const text = screen.getByText(testChain.name);
    expect(text).toBeInTheDocument();
  });

  test('should render assets', () => {
    render(<NetworkAssets chain={testChain} accountIds={[TEST_ACCOUNT_ID]} />);

    const balances = screen.getAllByTestId('AssetCard');
    expect(balances).toHaveLength(7);
  });

  test('should hide assets', async () => {
    render(<NetworkAssets chain={testChain} accountIds={[TEST_ACCOUNT_ID]} />);

    const balancesBefore = screen.getAllByTestId('AssetCard');
    expect(balancesBefore).toHaveLength(7);

    const button = screen.getByRole('button');
    await act(() => button.click());

    const balancesAfter = screen.queryByTestId('AssetCard');
    expect(balancesAfter).not.toBeInTheDocument();
  });

  test('should show unverified badge', () => {
    render(<NetworkAssets chain={testChain} accountIds={[TEST_ACCOUNT_ID]} />);

    const unverifiedBadge = screen.getByText('balances.verificationFailedLabel');
    expect(unverifiedBadge).toBeInTheDocument();
  });

  test('should sort assets by balance and name', () => {
    render(<NetworkAssets chain={testChain} accountIds={[TEST_ACCOUNT_ID]} />);

    const assetsNames = screen.getAllByTestId('AssetCard').map((element) => element.firstChild);

    expect(assetsNames[0]).toHaveTextContent(testAsset2.name);
    expect(assetsNames[1]).toHaveTextContent(testAsset.name);
    expect((assetsNames[2]?.textContent || '').localeCompare(assetsNames[3]?.textContent || '')).toEqual(-1);
  });
});
