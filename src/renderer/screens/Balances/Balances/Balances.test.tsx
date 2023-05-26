import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import Balances from './Balances';
import { TEST_ACCOUNT_ID } from '@renderer/shared/utils/constants';
import { ConnectionType } from '@renderer/domain/connection';
import { useAccount } from '@renderer/services/account/accountService';

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

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

jest.mock('../NetworkBalances/NetworkBalances', () => () => <div>NetworkBalances</div>);
jest.mock('@renderer/screens/Transfer/Transfer', () => 'TransferButton');

describe('screen/Balances/Balances', () => {
  test('should render component', () => {
    render(<Balances />, { wrapper: MemoryRouter });

    const text = screen.getByText('balances.title');
    expect(text).toBeInTheDocument();
  });

  test('should render networks', () => {
    render(<Balances />, { wrapper: MemoryRouter });

    const balances = screen.getAllByText('NetworkBalances');
    expect(balances).toHaveLength(2);
  });

  test('should render empty state', () => {
    (useAccount as jest.Mock).mockReturnValue({
      getActiveAccounts: () => [{ name: 'Test Wallet', accountId: TEST_ACCOUNT_ID }],
    });

    render(<Balances />, { wrapper: MemoryRouter });

    const noResults = screen.getByTestId('emptyOperations-img');
    expect(noResults).toBeInTheDocument();
  });
});
