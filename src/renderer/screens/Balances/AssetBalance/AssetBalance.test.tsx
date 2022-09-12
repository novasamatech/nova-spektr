import { act, render, screen } from '@testing-library/react';

import AssetBalance from './AssetBalance';
import { Chain } from '@renderer/domain/chain';
import { Asset } from '@renderer/domain/asset';
import chains from '@renderer/services/network/common/chains.json';
import { TEST_PUBLIC_KEY } from '@renderer/services/balance/common/constants';
import { Balance } from '@renderer/domain/balance';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string, value: any) => value.value,
  }),
}));

const testChain = chains[0] as Chain;
const testAsset = testChain.assets[0];

const defaultProps = {
  asset: testAsset as Asset,
  balance: {
    assetId: testAsset.assetId.toString(),
    chainId: testChain.chainId,
    publicKey: TEST_PUBLIC_KEY,
    free: '10',
    frozen: '2',
  } as Balance,
};

describe('screen/Balances/AssetBalance', () => {
  test('should render component', async () => {
    await act(async () => {
      render(<AssetBalance {...defaultProps} />);
    });

    const text = screen.getByTestId('balance');
    expect(text).toHaveTextContent('0.000000001 DOT');
  });

  test('should show expanded row', async () => {
    await act(async () => {
      render(<AssetBalance {...defaultProps} />);
    });

    const textHidden = screen.queryByTestId('transferable');
    expect(textHidden).not.toBeInTheDocument();

    const row = screen.getByRole('button');
    await act(() => row.click());

    const text = screen.getByTestId('transferable');
    expect(text).toHaveTextContent('0.0000000008 DOT');
  });

  test('should hide action buttons', async () => {
    await act(async () => {
      render(<AssetBalance {...defaultProps} />);
    });

    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toEqual(1);
  });

  test('should init transfer', async () => {
    const spyTransfer = jest.fn();

    await act(async () => {
      render(<AssetBalance {...defaultProps} canMakeActions onTransferClick={spyTransfer} />);
    });

    const buttons = screen.getAllByRole('button');
    buttons[1].click();

    expect(spyTransfer).toBeCalled();
  });

  test('should init receive', async () => {
    const spyReceive = jest.fn();

    await act(async () => {
      render(<AssetBalance {...defaultProps} canMakeActions onReceiveClick={spyReceive} />);
    });

    const buttons = screen.getAllByRole('button');
    buttons[2].click();

    expect(spyReceive).toBeCalled();
  });

  test('should show label for unverified balance', async () => {
    const spyReceive = jest.fn();

    await act(async () => {
      render(
        <AssetBalance
          asset={testAsset}
          balance={{
            assetId: testAsset.assetId.toString(),
            chainId: testChain.chainId,
            publicKey: TEST_PUBLIC_KEY,
            free: '10',
            frozen: '2',
            verified: false,
          }}
          canMakeActions
          onReceiveClick={spyReceive}
        />,
      );
    });

    const shield = screen.getByTestId('shield-svg');
    expect(shield).toBeInTheDocument();
  });
});
