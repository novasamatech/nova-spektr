import { act, render, screen } from '@testing-library/react';

import Explorers from './Explorers';
import { TEST_ADDRESS } from '@renderer/services/balance/common/constants';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('ui/Explorers', () => {
  test('should render component', async () => {
    render(
      <Explorers
        address={TEST_ADDRESS}
        chain={{
          name: 'My test chain',
          chainId: '0x123',
          addressPrefix: 0,
          assets: [],
          nodes: [],
          icon: 'test_icon.svg',
          explorers: [
            {
              name: 'Subscan',
              extrinsic: 'https://polkadot.subscan.io/extrinsic/{hash}',
              account: 'https://polkadot.subscan.io/account/{address}',
            },
            {
              name: 'Polkascan',
              extrinsic: 'https://polkadot.subscan.io/extrinsic/{hash}',
              account: 'https://polkadot.subscan.io/account/{address}',
            },
          ],
        }}
      />,
    );

    const button = screen.getByRole('button');

    await act(async () => {
      button.click();
    });

    const menuItems = screen.getAllByRole('menuitem');

    expect(menuItems).toHaveLength(2);
  });
});
