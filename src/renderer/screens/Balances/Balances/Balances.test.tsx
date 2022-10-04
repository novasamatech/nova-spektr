import { render, screen } from '@testing-library/react';

import { useWallet } from '@renderer/services/wallet/walletService';
import Balances from './Balances';
import { TEST_ADDRESS, TEST_PUBLIC_KEY } from '@renderer/services/balance/common/constants';
import { ConnectionType } from '@renderer/domain/connection';

jest.mock('@renderer/services/wallet/walletService', () => ({
  useWallet: jest.fn().mockReturnValue({
    getActiveWallets: () => [
      {
        name: 'Test Wallet',
        mainAccounts: [
          {
            address: '1ChFWeNRLarAPRCTM3bfJmncJbSAbSS9yqjueWz7jX7iTVZ',
            publicKey: TEST_PUBLIC_KEY,
          },
        ],
      },
    ],
  }),
}));

jest.mock('@renderer/context/NetworkContext', () => ({
  useNetworkContext: jest.fn(() => ({
    connections: {
      '0x0000000000000000000000000000000000000000': {
        chainId: '1',
        assets: [
          { assetId: '1', symbol: '1' },
          { assetId: '2', symbol: '2' },
        ],
        connection: {
          connectionType: ConnectionType.RPC_NODE,
        },
      },
      '0x0000000000000000000000000000000000000001': {
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

describe('screen/Balances/Balances', () => {
  test('should render component', () => {
    render(<Balances />);

    const text = screen.getByText('balances.title');
    expect(text).toBeInTheDocument();
  });

  test('should render networks', () => {
    render(<Balances />);

    const balances = screen.getAllByText('NetworkBalances');
    expect(balances).toHaveLength(2);
  });

  test('should render empty state', () => {
    (useWallet as jest.Mock).mockReturnValue({
      getActiveWallets: () => [
        {
          name: 'Test Wallet',
          mainAccounts: [
            {
              address: TEST_ADDRESS,
              publicKey: TEST_PUBLIC_KEY,
            },
          ],
        },
      ],
    });
    render(<Balances />);

    const noResults = screen.getByText('balances.emptyStateLabel');

    expect(noResults).toBeInTheDocument();
  });
});
