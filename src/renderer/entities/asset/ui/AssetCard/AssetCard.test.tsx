import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { Chain } from '@renderer/entities/chain/model/chain';
import { Asset } from '@renderer/entities/asset/model/asset';
import chains from '@renderer/entities/network/lib/common/chains/chains.json';
import { TEST_ACCOUNT_ID } from '@renderer/shared/lib/utils';
import { Balance } from '@renderer/entities/asset/model/balance';
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

describe('screen/Balances/AssetCard', () => {
  test('should render component', () => {
    render(<AssetCard {...defaultProps} />);

    const chainName = screen.getByText(testChain.name);
    expect(chainName).toBeInTheDocument();
  });

  test('should show expanded row', async () => {
    render(<AssetCard {...defaultProps} />);

    const textHidden = screen.queryByText('assetBalance.transferable');
    expect(textHidden).not.toBeInTheDocument();

    const row = screen.getByRole('button');
    await act(() => row.click());

    const text = screen.queryByText('assetBalance.transferable');
    expect(text).toBeInTheDocument();
  });

  test('should hide action buttons', () => {
    render(<AssetCard {...defaultProps} />);

    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toEqual(1);
  });

  test('should init receive', () => {
    const spyReceive = jest.fn();

    render(<AssetCard {...defaultProps} canMakeActions onReceiveClick={spyReceive} />, {
      wrapper: MemoryRouter,
    });

    const buttons = screen.getAllByRole('button');
    buttons[2].click();

    expect(spyReceive).toBeCalled();
  });

  // TODO add back when design is ready
  // test('should show label for unverified balance', () => {
  //   render(
  //     <AssetCard
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
