import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { TEST_ACCOUNT_ID } from '@renderer/shared/utils/constants';
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

jest.mock('@renderer/context/NetworkContext', () => ({
  useNetworkContext: jest.fn(() => ({
    connections: {
      '0x0': {
        chainId: '1',
        assets: [
          { assetId: '1', symbol: '1' },
          { assetId: '2', symbol: '2' },
        ],
        connection: {
          connectionType: ConnectionType.RPC_NODE,
        },
      },
      '0x1': {
        chainId: '2',
        assets: [{ assetId: '1', symbol: '1' }],
        connection: {
          connectionType: ConnectionType.RPC_NODE,
        },
      },
    },
  })),
}));

jest.mock('@renderer/screens/Transfer/Transfer', () => <span>TransferButton</span>);

jest.mock(
  '@renderer/components/common/AddressWithExplorers/AddressWithExplorers',
  jest.fn().mockReturnValue(({ address }: { address: string }) => <span data-testid="validator">{address}</span>),
);

jest.mock('../NetworkAssets/NetworkAssets', () => ({
  NetworkAssets: () => <span>NetworkAssets</span>,
}));

describe('screen/Balances/Balances', () => {
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
