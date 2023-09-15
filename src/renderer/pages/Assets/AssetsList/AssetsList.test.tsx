import { render, screen } from '@testing-library/react';

import { TEST_ACCOUNT_ID } from '@renderer/shared/lib/utils';
import { ConnectionType } from '@renderer/domain/connection';
import { useAccount } from '@renderer/entities/account';
import { AssetsList } from './AssetsList';

jest.mock('@renderer/app/providers', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
  useNetworkContext: jest.fn(() => ({
    connections: {
      '0x00': CHAINS[0],
      '0x01': CHAINS[1],
    },
  })),
}));

jest.mock('@renderer/entities/account', () => ({
  useAccount: jest.fn().mockReturnValue({
    getActiveAccounts: () => [{ name: 'Test Wallet', accountId: TEST_ACCOUNT_ID }],
  }),
  AddressWithExplorers: ({ address }: { address: string }) => <span data-testid="validator">{address}</span>,
  isMultisig: () => true,
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

jest.mock('@renderer/entities/network', () => ({
  chainsService: {
    sortChainsByBalance: () => CHAINS,
  },
}));

jest.mock('@renderer/entities/asset', () => ({
  useBalance: jest.fn().mockReturnValue({
    getLiveBalances: jest.fn().mockReturnValue([]),
  }),
}));

jest.mock('./components/NetworkAssets/NetworkAssets', () => ({
  NetworkAssets: () => <span>NetworkAssets</span>,
}));

describe('pages/Assets/Assets', () => {
  test('should render component', () => {
    render(<AssetsList />);

    const text = screen.getByText('balances.title');
    expect(text).toBeInTheDocument();
  });

  test('should render networks', () => {
    render(<AssetsList />);

    const balances = screen.getAllByText('NetworkAssets');
    expect(balances).toHaveLength(2);
  });

  test('should render empty state', () => {
    (useAccount as jest.Mock).mockReturnValue({
      getActiveAccounts: () => [{ name: 'Test Wallet', accountId: TEST_ACCOUNT_ID }],
    });

    render(<AssetsList />);

    const noResults = screen.getByTestId('emptyList-img');
    expect(noResults).toBeInTheDocument();
  });
});
