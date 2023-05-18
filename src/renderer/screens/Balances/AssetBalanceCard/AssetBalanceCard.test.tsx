import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import AssetBalanceCard from './AssetBalanceCard';
import { Chain } from '@renderer/domain/chain';
import { Asset } from '@renderer/domain/asset';
import chains from '@renderer/services/network/common/chains/chains.json';
import { TEST_ACCOUNT_ID } from '@renderer/shared/utils/constants';
import { Balance } from '@renderer/domain/balance';

jest.mock('@renderer/context/I18nContext', () => ({
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

describe('screen/Balances/AssetBalanceCard', () => {
  test('should render component', () => {
    render(<AssetBalanceCard {...defaultProps} />);

    const chainName = screen.getByText(testChain.name);
    expect(chainName).toBeInTheDocument();
  });

  test('should show expanded row', async () => {
    render(<AssetBalanceCard {...defaultProps} />);

    const textHidden = screen.queryByText('assetBalance.transferable');
    expect(textHidden).not.toBeInTheDocument();

    const row = screen.getByRole('button');
    await act(() => row.click());

    const text = screen.queryByText('assetBalance.transferable');
    expect(text).toBeInTheDocument();
  });

  test('should hide action buttons', () => {
    render(<AssetBalanceCard {...defaultProps} />);

    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toEqual(1);
  });

  test('should init transfer', () => {
    render(<AssetBalanceCard {...defaultProps} canMakeActions />, { wrapper: MemoryRouter });

    const transferIcon = screen.getByTestId('transferButton');
    expect(transferIcon).toBeInTheDocument();
  });

  test('should init receive', () => {
    const spyReceive = jest.fn();

    render(<AssetBalanceCard {...defaultProps} canMakeActions onReceiveClick={spyReceive} />, {
      wrapper: MemoryRouter,
    });

    const buttons = screen.getAllByRole('button');
    buttons[1].click();

    expect(spyReceive).toBeCalled();
  });

  {
    /* TODO add back when design is ready */
  }
  // test('should show label for unverified balance', () => {
  //   render(
  //     <AssetBalanceCard
  //       asset={testAsset}
  //       chainId={testChain.chainId}
  //       balance={{
  //         assetId: testAsset.assetId.toString(),
  //         chainId: testChain.chainId,
  //         accountId: TEST_ACCOUNT_ID,
  //         free: '10',
  //         frozen: '2',
  //         verified: false,
  //       }}
  //     />,
  //   );
  //
  //   const shield = screen.getByTestId('shield-svg');
  //   expect(shield).toBeInTheDocument();
  // });
});
