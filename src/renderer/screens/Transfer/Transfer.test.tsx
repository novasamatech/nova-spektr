import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { ConnectionType } from '@renderer/domain/connection';
import Transfer from './Transfer';
import { TEST_ADDRESS, TEST_PUBLIC_KEY } from '@renderer/services/balance/common/constants';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

jest.mock('@renderer/context/NetworkContext', () => ({
  useNetworkContext: jest.fn(() => ({
    connections: {
      '0x123': {
        chainId: '0x123',
        assets: [
          { assetId: '1', symbol: '1' },
          { assetId: '2', symbol: '2' },
        ],
        connection: {
          connectionType: ConnectionType.RPC_NODE,
        },
      },
    },
  })),
}));

jest.mock('@renderer/services/wallet/walletService', () => ({
  useWallet: jest.fn().mockReturnValue({
    getActiveWallets: () => [
      {
        name: 'Test Wallet',
        mainAccounts: [{ accountId: TEST_ADDRESS, publicKey: TEST_PUBLIC_KEY }],
      },
    ],
  }),
}));

jest.mock('@renderer/services/balance/balanceService', () => ({
  useBalance: jest.fn().mockReturnValue({
    getBalance: jest.fn().mockReturnValue({
      assetId: 1,
      chainId: '0x123',
      publicKey: '0x08eb319467ea54784cd9edfbd03bbcc53f7a021ed8d9ed2ca97b6ae46b3f6014',
      free: '10',
      frozen: [{ type: 'test', amount: '1' }],
    }),
  }),
}));

describe('Transfer', () => {
  test('should render component', () => {
    render(
      <MemoryRouter initialEntries={['/transfer/0x123/1']}>
        <Routes>
          <Route path="/transfer/:chainId/:assetId" element={<Transfer />} />
        </Routes>
      </MemoryRouter>,
    );

    const text = screen.getByText('transfer.title');
    expect(text).toBeInTheDocument();
  });
});
