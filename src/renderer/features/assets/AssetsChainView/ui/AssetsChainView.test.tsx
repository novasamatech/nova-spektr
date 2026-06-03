import { act, render, screen, waitFor } from '@testing-library/react';
import { allSettled, fork } from 'effector';
import { Provider } from 'effector-react';
import { afterEach, vi } from 'vitest';

import { type Connection, type Wallet, ConnectionType, CryptoType, SigningType, WalletType } from '@/shared/core';
import { createAccountId, polkadotChain } from '@/shared/mocks';
import { type AnyAccount, accountService, accounts } from '@/domains/network';
import { balanceModel } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';

import { AssetsChainView } from './AssetsChainView';

vi.mock('@/domains/price', async (importOriginal) => ({
  ...(await importOriginal()),
  useAssetsPrices: () => ({ data: null }),
}));

vi.mock('./NetworkAssets/NetworkAssets', () => ({
  NetworkAssets: ({ chain }: { chain: typeof polkadotChain }) => <div data-testid="NetworkAssets">{chain.name}</div>,
}));

const mockAccount: AnyAccount = {
  id: '1',
  walletId: 1,
  name: 'My base account',
  type: 'universal',
  accountId: createAccountId('1'),
  signingType: SigningType.POLKADOT_VAULT,
  cryptoType: CryptoType.SR25519,
  createdAt: Date.now(),
};

const mockWallet: Wallet = {
  id: 1,
  name: 'My first wallet',
  type: WalletType.POLKADOT_VAULT,
  accounts: [mockAccount],
};

const mockConnection = {
  id: 1,
  chainId: polkadotChain.chainId,
  connectionType: ConnectionType.AUTO_BALANCE,
  customNodes: [],
} as Connection;

describe('features/AssetsChainView/ui/AssetsChainView', () => {
  afterEach(() => {
    accountService.accountAvailabilityOnChainAnyOf.resetHandlers();
  });

  test('should render loader instead of null while visible accounts are not populated', async () => {
    const scope = fork();

    await act(async () => {
      render(
        <Provider value={scope}>
          <AssetsChainView query="" visibleAccounts={[]} hideZeroBalances={false} />
        </Provider>,
      );
    });

    expect(screen.getByTestId('Icon:loader')).toBeInTheDocument();
  });

  test('should recompute chains when account availability handlers are registered after startup', async () => {
    const scope = fork({
      values: new Map()
        .set(accounts.__test.$populated, true)
        .set(accounts.__test.$list, [mockAccount])
        .set(walletSelect.__test.$selectedWalletId, mockWallet.id)
        .set(networkModel.$chains, { [polkadotChain.chainId]: polkadotChain })
        .set(networkModel.$connections, { [polkadotChain.chainId]: mockConnection })
        .set(balanceModel.__test.$populated, true),
    });

    await allSettled(walletModel.__test.$rawWallets, { scope, params: [mockWallet] });

    await act(async () => {
      render(
        <Provider value={scope}>
          <AssetsChainView query="" visibleAccounts={[mockAccount]} hideZeroBalances={false} />
        </Provider>,
      );
    });

    expect(screen.queryByTestId('NetworkAssets')).not.toBeInTheDocument();

    accountService.accountAvailabilityOnChainAnyOf.registerHandler({ body: () => true, available: () => true });

    await act(async () => {
      await allSettled(accountService.accountAvailabilityOnChainAnyOf.updateHandlers, { scope });
    });

    await waitFor(() => expect(screen.getByTestId('NetworkAssets')).toBeInTheDocument());
  });
});
