import { act, render, screen } from '@testing-library/react';

import NetworkBalances from './NetworkBalances';
import { Chain } from '@renderer/domain/chain';
import { TEST_ACCOUNT_ID } from '@renderer/shared/utils/constants';
import chains from '@renderer/services/network/common/chains/chains.json';

const testChain = chains.find((chain) => chain.assets.length > 3) as Chain;
const testAsset = testChain.assets[0];
const testAsset2 = testChain.assets[1];

jest.mock('@renderer/services/balance/balanceService', () => ({
  useBalance: jest.fn().mockReturnValue({
    getLiveNetworkBalances: () => [
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
    ],
  }),
}));

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

type TestAsset = { asset: { name: string } };
jest.mock('../AssetBalanceCard/AssetBalanceCard', () => ({ asset }: TestAsset) => (
  <div data-testid="AssetBalanceCard">{asset?.name}</div>
));

describe('screen/Balances/NetworkBalances', () => {
  test('should render component', () => {
    render(<NetworkBalances chain={testChain} accountIds={[TEST_ACCOUNT_ID]} />);

    const text = screen.getByText(testChain.name);
    expect(text).toBeInTheDocument();
  });

  test('should render assets', () => {
    render(<NetworkBalances chain={testChain} accountIds={[TEST_ACCOUNT_ID]} />);

    const balances = screen.getAllByTestId('AssetBalanceCard');
    expect(balances).toHaveLength(7);
  });

  test('should hide assets', async () => {
    render(<NetworkBalances chain={testChain} accountIds={[TEST_ACCOUNT_ID]} />);

    const balancesBefore = screen.getAllByTestId('AssetBalanceCard');
    expect(balancesBefore).toHaveLength(7);

    const button = screen.getByRole('button');
    await act(() => button.click());

    const balancesAfter = screen.queryAllByTestId('AssetBalanceCard');
    expect(balancesAfter).toEqual([]);
  });

  test('should show unverfied badge', () => {
    render(<NetworkBalances chain={testChain} accountIds={[TEST_ACCOUNT_ID]} />);

    const unverifiedBadge = screen.getByText('balances.verificationFailedLabel');
    expect(unverifiedBadge).toBeInTheDocument();
  });

  test('should sort assets by balance and name', () => {
    render(<NetworkBalances chain={testChain} accountIds={[TEST_ACCOUNT_ID]} />);

    const assetsNames = screen.getAllByTestId('AssetBalanceCard').map((element) => element.firstChild);
    console.log(testChain);
    console.log(assetsNames);

    // check sort by balance
    expect(assetsNames[0]).toHaveTextContent(testAsset2.name);
    expect(assetsNames[1]).toHaveTextContent(testAsset.name);
    // check zero balance with sort by name
    expect((assetsNames[2]?.textContent || '').localeCompare(assetsNames[3]?.textContent || '')).toEqual(-1);
  });
});
