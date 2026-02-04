import { BN_TEN, BN_TWO, BN_ZERO } from '@polkadot/util';
import { act, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { fork } from 'effector';
import { Provider } from 'effector-react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';

import { type Asset, type Balance, type BalanceId, type Wallet, SigningType, WalletType } from '@/shared/core';
import { TEST_ACCOUNTS } from '@/shared/lib/utils';
import { polkadotChain } from '@/shared/mocks';
import { walletModel } from '@/entities/wallet';

import { AssetCard } from './AssetCard';

vi.mock('@/shared/i18n', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

const testChain = polkadotChain;
const testAsset = testChain.assets[0]!;

const defaultProps = {
  asset: testAsset as Asset,
  chainId: testChain.chainId,
  balance: {
    id: '1' as BalanceId,
    assetId: testAsset.assetId,
    assetType: testAsset.type,
    chainId: testChain.chainId,
    accountId: TEST_ACCOUNTS[0],
    free: BN_TEN,
    frozen: BN_TWO,
    ed: BN_ZERO,
    reserved: BN_ZERO,
    providers: 0,
    consumers: 0,
    sufficients: 0,
    locked: [],
    transferableMode: 'holdAndFreezes',
  } satisfies Balance,
  wallet: {
    walletId: 1,
    id: 1,
    type: WalletType.POLKADOT_VAULT,
    isActive: true,
    name: 'test',
    accounts: [],
    signingType: SigningType.POLKADOT_VAULT,
  } as Wallet,
};

describe('pages/Assets/AssetCard', () => {
  test('should render component', () => {
    render(<AssetCard {...defaultProps} />, { wrapper: BrowserRouter });

    const chainName = screen.getByText(testChain.name);
    expect(chainName).toBeInTheDocument();
  });

  test('should show expanded row', async () => {
    render(<AssetCard {...defaultProps} />, { wrapper: BrowserRouter });

    const textHidden = screen.queryByText('assetBalance.transferable');
    expect(textHidden).not.toBeInTheDocument();

    await userEvent.click(screen.getAllByRole('button')[0]!);

    const text = screen.queryByText('assetBalance.transferable');
    expect(text).toBeInTheDocument();
  });

  test('should hide action buttons', () => {
    render(<AssetCard {...defaultProps} />, { wrapper: BrowserRouter });

    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toEqual(3);
  });

  test('should navigate to receive asset modal', async () => {
    const scope = fork({
      values: new Map().set(walletModel.__test.$rawWallets, [
        {
          walletId: 1,
          type: WalletType.POLKADOT_VAULT,
          isActive: true,
        },
      ]),
    });

    const origin = window.location.origin;
    window.history.pushState({}, '', '/assets');

    await act(async () => {
      render(
        <Provider value={scope}>
          <AssetCard {...defaultProps} />
        </Provider>,
        { wrapper: BrowserRouter },
      );
    });

    expect(window.location.href).toEqual(new URL('/assets', origin).toString());

    const button = screen.getAllByRole('button')[1]!;
    act(() => button.click());

    const chainId = defaultProps.chainId;
    const assetId = defaultProps.asset.assetId;
    expect(window.location.href).toEqual(
      new URL(`/assets/transfer?chainId=${chainId}&assetId=${assetId}`, origin).toString(),
    );
  });
});
