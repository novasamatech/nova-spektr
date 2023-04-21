import { act, render, screen } from '@testing-library/react';

import { TEST_ACCOUNT_ID } from '@renderer/shared/utils/constants';
import { Chain } from '@renderer/domain/chain';
import AccountsList from './AccountsList';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('components/common/AccountsList', () => {
  const chains = [
    {
      chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
      name: 'Polkadot',
      assets: [],
      nodes: [],
      explorers: [
        {
          name: 'Subscan',
          extrinsic: 'https://polkadot.subscan.io/extrinsic/{hash}',
          account: 'https://polkadot.subscan.io/account/{address}',
          event: null,
        },
        {
          name: 'Polkascan',
          extrinsic: 'https://polkascan.io/polkadot/extrinsic/{hash}',
          account: 'https://polkascan.io/polkadot/account/{address}',
          event: 'https://polkascan.io/polkadot/event/{event}',
        },
        {
          name: 'Sub.ID',
          account: 'https://sub.id/{address}',
        },
      ],
      icon: 'https://raw.githubusercontent.com/nova-wallet/nova-utils/master/icons/chains/gradient/Polkadot.svg',
      addressPrefix: 0,
    },
  ] as Chain[];

  test('should render component', () => {
    render(<AccountsList chains={chains} accountId={TEST_ACCOUNT_ID} />);

    const chainTitle = screen.getByText('Polkadot');
    expect(chainTitle).toBeInTheDocument();

    const explorer = screen.getByRole('button', { name: 'options.svg' });
    act(() => explorer.click());

    const explorerLinks = screen.getAllByText('general.explorers.explorerButton');
    expect(explorerLinks).toHaveLength(3);
  });
});
