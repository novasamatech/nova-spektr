import { render, screen } from '@testing-library/react';

import { useWallet } from '@renderer/services/wallet/walletService';
import Balances from './Balances';
import { TEST_PUBLIC_KEY } from '@renderer/services/balance/common/constants';

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
      },
      '0x0000000000000000000000000000000000000001': {
        chainId: '2',
        assets: [{ assetId: '1', symbol: '1' }],
      },
    },
  })),
}));

jest.mock('../NetworkBalances/NetworkBalances', () => () => <div>NetworkBalances</div>);

describe('screen/Balances/Balances', () => {
  test('should render component', () => {
    render(<Balances />);

    const text = screen.getByText('Balances');
    expect(text).toBeInTheDocument();
  });

  test('should render networks', () => {
    render(<Balances />);

    const balances = screen.getAllByText('NetworkBalances');
    expect(balances).toHaveLength(2);
  });

  test('should render empty list', () => {
    (useWallet as jest.Mock).mockReturnValue({
      getActiveWallets: () => [],
    });
    render(<Balances />);

    const noResults = screen.getByText('Nothing to show');
    const networks = screen.queryByRole('list');
    expect(noResults).toBeInTheDocument();
    expect(networks).not.toBeInTheDocument();
  });
});
