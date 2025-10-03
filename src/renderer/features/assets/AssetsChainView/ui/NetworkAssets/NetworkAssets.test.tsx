import { BN, BN_ZERO } from '@polkadot/util';
import { act, render, screen } from '@testing-library/react';
import { fork } from 'effector';
import { Provider } from 'effector-react';
import { vi } from 'vitest';

import {
  AccountType,
  type Balance,
  type BalanceId,
  type BalanceMap,
  CryptoType,
  SigningType,
  type VaultBaseAccount,
  type VaultChainAccount,
  type VaultShardAccount,
  type Wallet,
  WalletType,
} from '@/shared/core';
import { TEST_ACCOUNTS } from '@/shared/lib/utils';
import { polkadotAssetHubChain } from '@/shared/mocks';
import { balanceModel } from '@/entities/balance';
import { networkModel } from '@/entities/network';

import { NetworkAssets } from './NetworkAssets';

const testChain = polkadotAssetHubChain;
const testAsset = testChain.assets[0];
const testAsset2 = testChain.assets[1];

vi.mock('@/shared/i18n', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

const testWallet = {
  walletId: 1,
  id: 1,
  type: WalletType.POLKADOT_VAULT,
  isActive: true,
  name: 'test',
  accounts: [],
  signingType: SigningType.POLKADOT_VAULT,
} as Wallet;

const testBalances: Balance[] = [
  {
    id: '0' as BalanceId,
    assetId: testAsset.assetId,
    chainId: testChain.chainId,
    accountId: TEST_ACCOUNTS[0],
    free: new BN(10),
    locked: [],
    frozen: BN_ZERO,
    reserved: BN_ZERO,
    ed: BN_ZERO,
    transferableMode: 'holdAndFreezes',
  },
  {
    id: '1' as BalanceId,
    assetId: testAsset2.assetId,
    chainId: testChain.chainId,
    accountId: TEST_ACCOUNTS[0],
    free: new BN(1000000000000),
    frozen: BN_ZERO,
    reserved: BN_ZERO,
    ed: BN_ZERO,
    transferableMode: 'holdAndFreezes',
    locked: [],
  },
];

vi.mock('../AssetCard/AssetCard', () => ({
  AssetCard: ({ asset }: any) => <span data-testid="AssetCard">{asset.name}</span>,
}));

const accounts: (VaultBaseAccount | VaultChainAccount | VaultShardAccount)[] = [
  {
    id: '1',
    walletId: 1,
    type: 'universal',
    name: 'test',
    accountType: AccountType.BASE,
    accountId: TEST_ACCOUNTS[0],
    cryptoType: CryptoType.SR25519,
    signingType: SigningType.POLKADOT_VAULT,
  },
];

describe('features/AssetsChainView/ui/NetworkAssets', () => {
  const scope = fork({
    values: new Map()
      .set(
        balanceModel.__test.$balanceMap,
        testBalances.reduce<BalanceMap>((acc, b) => ({ ...acc, [b.id]: b }), {}),
      )
      .set(networkModel.$chains, { [testChain.chainId]: testChain }),
  });

  const renderNetworkAssets = async () => {
    await act(async () => {
      render(
        <Provider value={scope}>
          <NetworkAssets chain={testChain} accounts={accounts} hideZeroBalances={false} query="" wallet={testWallet} />
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
    expect(balances).toHaveLength(testChain.assets.length);
  });

  test('should hide assets', async () => {
    await renderNetworkAssets();

    const balancesBefore = screen.getAllByTestId('AssetCard');
    expect(balancesBefore).toHaveLength(testChain.assets.length);

    const button = screen.getByRole('button');
    act(() => button.click());

    const balancesAfter = screen.queryByTestId('AssetCard');
    expect(balancesAfter).not.toBeInTheDocument();
  });

  // TODO weird, fix it later
  test.skip('should sort assets by balance and name', async () => {
    await renderNetworkAssets();

    const assetsNames = screen.getAllByTestId('AssetCard').map((element) => element.firstChild);

    expect(assetsNames[0]).toHaveTextContent(testAsset2.name);
    expect(assetsNames[1]).toHaveTextContent(testAsset.name);
    expect((assetsNames[1]?.textContent || '').localeCompare(assetsNames[2]?.textContent || '')).toBeLessThanOrEqual(
      -1,
    );
  });
});
