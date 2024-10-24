import { act, render, screen } from '@testing-library/react';
import { fork } from 'effector';
import { Provider } from 'effector-react';

import chains from '@/shared/config/chains/chains.json';
import { type BaseAccount, type Chain, type ChainAccount, type ShardAccount } from '@/shared/core';
import { AccountType, ChainType, CryptoType } from '@/shared/core';
import { TEST_ACCOUNTS } from '@/shared/lib/utils';
import { balanceModel } from '@/entities/balance';

import { NetworkAssets } from './NetworkAssets';

const testChain = chains.find((chain) => chain.assets.length > 1) as Chain;
const testAsset = testChain.assets[0];
const testAsset2 = testChain.assets[1];

jest.mock('@/shared/i18n', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

const testBalances = [
  {
    assetId: testAsset.assetId.toString(),
    chainId: testChain.chainId,
    accountId: TEST_ACCOUNTS[0],
    free: '10',
    frozen: [{ type: 'test', amount: '1' }],
  },
  {
    assetId: testAsset2.assetId.toString(),
    chainId: testChain.chainId,
    accountId: TEST_ACCOUNTS[0],
    free: '1000000000000',
    frozen: [{ type: 'test', amount: '1' }],
    verified: false,
  },
];

jest.mock('../AssetCard/AssetCard', () => ({
  AssetCard: ({ asset }: any) => <span data-testid="AssetCard">{asset.name}</span>,
}));

const accounts = [
  {
    id: 1,
    walletId: 1,
    name: 'test',
    type: AccountType.BASE,
    accountId: TEST_ACCOUNTS[0],
    cryptoType: CryptoType.SR25519,
    chainType: ChainType.SUBSTRATE,
  },
] as (BaseAccount | ChainAccount | ShardAccount)[];

describe('features/AssetsChainView/ui/NetworkAssets', () => {
  const scope = fork({
    values: new Map().set(balanceModel.$balances, testBalances),
  });

  const renderNetworkAssets = async () => {
    await act(async () => {
      render(
        <Provider value={scope}>
          <NetworkAssets chain={testChain} accounts={accounts} hideZeroBalances={false} query="" />
        </Provider>,
      );
    });
  };

  test('should render component', async () => {
    await renderNetworkAssets();

    const text = screen.getByText(testChain.name);
    expect(text).toBeInTheDocument();
  });

  test('should render assets', async () => {
    await renderNetworkAssets();

    const balances = screen.getAllByTestId('AssetCard');
    expect(balances).toHaveLength(7);
  });

  test('should hide assets', async () => {
    await renderNetworkAssets();

    const balancesBefore = screen.getAllByTestId('AssetCard');
    expect(balancesBefore).toHaveLength(7);

    const button = screen.getByRole('button');
    act(() => button.click());

    const balancesAfter = screen.queryByTestId('AssetCard');
    expect(balancesAfter).not.toBeInTheDocument();
  });

  test('should show unverified badge', async () => {
    await renderNetworkAssets();

    const unverifiedBadge = screen.getByText('balances.verificationFailedLabel');
    expect(unverifiedBadge).toBeInTheDocument();
  });

  test('should sort assets by balance and name', async () => {
    await renderNetworkAssets();

    const assetsNames = screen.getAllByTestId('AssetCard').map((element) => element.firstChild);

    expect(assetsNames[0]).toHaveTextContent(testAsset2.name);
    expect(assetsNames[1]).toHaveTextContent(testAsset.name);
    expect((assetsNames[2]?.textContent || '').localeCompare(assetsNames[3]?.textContent || '')).toEqual(-1);
  });
});
