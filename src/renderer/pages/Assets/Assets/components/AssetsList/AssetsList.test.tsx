import { render, screen } from '@testing-library/react';
import { fork } from 'effector';
import { Provider } from 'effector-react';

import { TEST_ACCOUNT_ID } from '@shared/lib/utils';
import { ConnectionType } from '@shared/core';
import { AssetsList } from './AssetsList';
import { networkModel } from '@entities/network';
import { assetsModel } from '../../model/assets-model';

jest.mock('@app/providers', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

const CHAINS = [
  {
    chainId: '0x00',
    assets: [
      { assetId: '1', symbol: '1' },
      { assetId: '2', symbol: '2' },
    ],
    connection: { connectionType: ConnectionType.RPC_NODE },
  },
  {
    chainId: '0x01',
    assets: [{ assetId: '1', symbol: '1' }],
    connection: { connectionType: ConnectionType.RPC_NODE },
  },
];

jest.mock('@entities/network', () => ({
  ...jest.requireActual('@entities/network'),
  chainsService: {
    getChainById: jest.fn().mockReturnValue({
      name: 'Westend',
      chainId: '0xe143f23803ac50e8f6f8e62695d1ce9e4e1d68aa36c1cd2cfd15340213f3423e',
      assets: [
        {
          assetId: 0,
          symbol: 'WND',
          precision: 10,
          staking: 'relaychain',
          name: 'Westend',
        },
      ],
    }),
    sortChainsByBalance: () => CHAINS,
  },
}));

jest.mock('../NetworkAssets/NetworkAssets', () => ({
  NetworkAssets: () => <span>NetworkAssets</span>,
}));

describe('pages/Assets/Assets/components/AssetsList', () => {
  const scope = fork({
    values: new Map()
      .set(assetsModel.$activeShards, [{ name: 'Test Wallet', accountId: TEST_ACCOUNT_ID }])
      .set(networkModel.$chains, {
        '0x00': CHAINS[0],
        '0x01': CHAINS[1],
      }),
  });

  const renderComponent = () => {
    render(
      <Provider value={scope}>
        <AssetsList />
      </Provider>,
    );
  };

  test('should render networks', () => {
    renderComponent();

    const balances = screen.getAllByText('NetworkAssets');
    expect(balances).toHaveLength(2);
  });

  test('should render empty state', () => {
    renderComponent();

    const noResults = screen.getByTestId('emptyList-img');
    expect(noResults).toBeInTheDocument();
  });
});
