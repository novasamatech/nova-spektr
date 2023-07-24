import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { TEST_ACCOUNT_ID } from '@renderer/shared/lib/utils';
import { ConnectionType } from '@renderer/domain/connection';
import { useAccount } from '@renderer/services/account/accountService';
import { Assets } from './Assets';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

jest.mock('@renderer/services/account/accountService', () => ({
  useAccount: jest.fn().mockReturnValue({
    getActiveAccounts: () => [{ name: 'Test Wallet', accountId: TEST_ACCOUNT_ID }],
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

jest.mock('@renderer/services/network/chainsService', () => ({
  useChains: jest.fn().mockReturnValue({
    sortChainsByBalance: () => CHAINS,
  }),
}));

jest.mock('@renderer/services/balance/balanceService', () => ({
  useBalance: jest.fn().mockReturnValue({
    getLiveBalances: jest.fn().mockReturnValue([]),
  }),
}));

jest.mock('@renderer/context/NetworkContext', () => ({
  useNetworkContext: jest.fn(() => ({
    connections: {
      '0x00': CHAINS[0],
      '0x01': CHAINS[1],
    },
  })),
}));

jest.mock(
  '@renderer/components/common/AddressWithExplorers/AddressWithExplorers',
  jest.fn().mockReturnValue(({ address }: { address: string }) => <span data-testid="validator">{address}</span>),
);

jest.mock('@renderer/screens/Transfer/Transfer', () => <span>TransferButton</span>);

jest.mock('./components/NetworkAssets/NetworkAssets', () => ({
  NetworkAssets: () => <span>NetworkAssets</span>,
}));

describe('screen/Assets/Assets', () => {
  test('should render component', () => {
    render(<Assets />, { wrapper: MemoryRouter });

    const text = screen.getByText('balances.title');
    expect(text).toBeInTheDocument();
  });

  test('should render networks', () => {
    render(<Assets />, { wrapper: MemoryRouter });

    const balances = screen.getAllByText('NetworkAssets');
    expect(balances).toHaveLength(2);
  });

  test('should render empty state', () => {
    (useAccount as jest.Mock).mockReturnValue({
      getActiveAccounts: () => [{ name: 'Test Wallet', accountId: TEST_ACCOUNT_ID }],
    });

    render(<Assets />, { wrapper: MemoryRouter });

    const noResults = screen.getByTestId('emptyList-img');
    expect(noResults).toBeInTheDocument();
  });
});
