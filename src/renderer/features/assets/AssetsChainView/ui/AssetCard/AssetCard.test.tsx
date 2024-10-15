import { act, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { fork } from 'effector';
import { Provider } from 'effector-react';
import { BrowserRouter } from 'react-router-dom';

import chains from '@shared/config/chains/chains.json';
import { type Asset, type Balance, type Chain, WalletType } from '@shared/core';
import { TEST_ACCOUNTS } from '@shared/lib/utils';
import { walletModel } from '@entities/wallet';

import { AssetCard } from './AssetCard';

jest.mock('@app/providers', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

const testChain = chains[0] as Chain;
const testAsset = testChain.assets[0];

const defaultProps = {
  asset: testAsset as Asset,
  chainId: testChain.chainId,
  balance: {
    id: 1,
    assetId: testAsset.assetId.toString(),
    chainId: testChain.chainId,
    accountId: TEST_ACCOUNTS[0],
    free: '10',
    frozen: '2',
  } as Balance,
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

    await userEvent.click(screen.getByRole('button'));

    const text = screen.queryByText('assetBalance.transferable');
    expect(text).toBeInTheDocument();
  });

  test('should hide action buttons', () => {
    render(<AssetCard {...defaultProps} />, { wrapper: BrowserRouter });

    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toEqual(1);
  });

  test('should navigate to receive asset modal', async () => {
    const scope = fork({
      values: new Map().set(walletModel.$wallets, [
        {
          walletId: 1,
          type: WalletType.POLKADOT_VAULT,
          isActive: true,
        },
      ]),
    });

    window.history.pushState({}, '', '/assets');

    await act(async () => {
      render(
        <Provider value={scope}>
          <AssetCard {...defaultProps} />
        </Provider>,
        { wrapper: BrowserRouter },
      );
    });

    expect(window.location.href).toEqual('http://localhost/assets');

    const link = screen.getAllByRole('link')[1];
    act(() => link.click());

    const chainId = defaultProps.chainId;
    const assetId = defaultProps.asset.assetId;
    expect(window.location.href).toEqual(`http://localhost/assets/receive?chainId=${chainId}&assetId=${assetId}`);
  });
});
