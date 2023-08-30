import { act, render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';

import chains from '@renderer/assets/chains/chains.json';
import { Chain } from '@renderer/entities/chain';
import { Asset, Balance } from '@renderer/entities/asset';
import { TEST_ACCOUNT_ID } from '@renderer/shared/lib/utils';
import { AssetCard } from './AssetCard';

jest.mock('@renderer/app/providers', () => ({
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
    assetId: testAsset.assetId.toString(),
    chainId: testChain.chainId,
    accountId: TEST_ACCOUNT_ID,
    free: '10',
    frozen: '2',
  } as Balance,
};

const renderAssetCard = (canMakeActions = false) => {
  render(<AssetCard {...defaultProps} canMakeActions={canMakeActions} />, { wrapper: BrowserRouter });
};

describe('screen/Assets/AssetCard', () => {
  test('should render component', () => {
    renderAssetCard();

    const chainName = screen.getByText(testChain.name);
    expect(chainName).toBeInTheDocument();
  });

  test('should show expanded row', async () => {
    renderAssetCard();

    const textHidden = screen.queryByText('assetBalance.transferable');
    expect(textHidden).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button'));

    const text = screen.queryByText('assetBalance.transferable');
    expect(text).toBeInTheDocument();
  });

  test('should hide action buttons', () => {
    renderAssetCard();

    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toEqual(1);
  });

  test('should navigate to receive asset modal', () => {
    window.history.pushState({}, '', '/assets');
    renderAssetCard(true);
    expect(window.location.href).toEqual('http://localhost/assets');

    const link = screen.getAllByRole('link')[1];
    act(() => link.click());

    const chainId = defaultProps.chainId;
    const assetId = defaultProps.asset.assetId;
    expect(window.location.href).toEqual(`http://localhost/assets/receive?chainId=${chainId}&assetId=${assetId}`);
  });
});
