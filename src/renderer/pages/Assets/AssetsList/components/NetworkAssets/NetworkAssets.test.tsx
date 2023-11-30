import { act, render, screen } from '@testing-library/react';
import { Provider } from 'effector-react';
import { fork } from 'effector';

import { TEST_ACCOUNT_ID } from '@shared/lib/utils';
import chains from '@shared/config/chains/chains.json';
import { NetworkAssets } from './NetworkAssets';
import type { Account, Chain } from '@shared/core';
import { ChainType, CryptoType, AccountType } from '@shared/core';
import { balanceModel } from '@entities/balance';

const testChain = chains.find((chain) => chain.assets.length > 1) as Chain;
const testAsset = testChain.assets[0];
const testAsset2 = testChain.assets[1];

jest.mock('@app/providers', () => ({
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

jest.mock('@entities/asset', () => ({
  AssetCard: ({ asset }: any) => <span data-testid="AssetCard">{asset.name}</span>,
}));

const accounts = [
  {
    id: 1,
    walletId: 1,
    name: 'test',
    type: AccountType.BASE,
    accountId: TEST_ACCOUNT_ID,
    cryptoType: CryptoType.SR25519,
    chainType: ChainType.SUBSTRATE,
  },
] as Account[];

describe('pages/Assets/NetworkAssets', () => {
  const scope = fork({
    values: new Map().set(balanceModel.$balances, testBalances),
  });

  test('should render component', () => {
    render(
      <Provider value={scope}>
        <NetworkAssets chain={testChain} accounts={accounts} />
      </Provider>,
    );

    const text = screen.getByText(testChain.name);
    expect(text).toBeInTheDocument();
  });

  test('should render assets', () => {
    render(
      <Provider value={scope}>
        <NetworkAssets chain={testChain} accounts={accounts} />
      </Provider>,
    );

    const balances = screen.getAllByTestId('AssetCard');
    expect(balances).toHaveLength(7);
  });

  test('should hide assets', async () => {
    render(
      <Provider value={scope}>
        <NetworkAssets chain={testChain} accounts={accounts} />
      </Provider>,
    );

    const balancesBefore = screen.getAllByTestId('AssetCard');
    expect(balancesBefore).toHaveLength(7);

    const button = screen.getByRole('button');
    await act(() => button.click());

    const balancesAfter = screen.queryByTestId('AssetCard');
    expect(balancesAfter).not.toBeInTheDocument();
  });

  test('should show unverified badge', () => {
    render(
      <Provider value={scope}>
        <NetworkAssets chain={testChain} accounts={accounts} />
      </Provider>,
    );

    const unverifiedBadge = screen.getByText('balances.verificationFailedLabel');
    expect(unverifiedBadge).toBeInTheDocument();
  });

  test('should sort assets by balance and name', () => {
    render(
      <Provider value={scope}>
        <NetworkAssets chain={testChain} accounts={accounts} />
      </Provider>,
    );

    const assetsNames = screen.getAllByTestId('AssetCard').map((element) => element.firstChild);

    expect(assetsNames[0]).toHaveTextContent(testAsset2.name);
    expect(assetsNames[1]).toHaveTextContent(testAsset.name);
    expect((assetsNames[2]?.textContent || '').localeCompare(assetsNames[3]?.textContent || '')).toEqual(-1);
  });
});
