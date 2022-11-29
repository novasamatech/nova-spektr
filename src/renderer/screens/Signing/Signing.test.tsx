import { act, render, screen } from '@testing-library/react';

import { ConnectionType } from '@renderer/domain/connection';
import { TEST_PUBLIC_KEY } from '@renderer/services/balance/common/constants';
import Signing from './Signing';

jest.mock('./ParitySignerSignatureReader/ParitySignerSignatureReader', () => () => 'scan-signature');

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
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
    },
  })),
}));

jest.mock('@renderer/services/wallet/walletService', () => ({
  useWallet: jest.fn().mockReturnValue({
    getActiveWallets: () => [
      {
        name: 'Test Wallet',
        mainAccounts: [{ accountId: '1ChFWeNRLarAPRCTM3bfJmncJbSAbSS9yqjueWz7jX7iTVZ', publicKey: TEST_PUBLIC_KEY }],
      },
    ],
  }),
}));

describe('screens/Signing', () => {
  test('should render component', async () => {
    render(<Signing />);

    const continueButton = screen.getByRole('button', { name: 'signing.continueButton' });

    expect(continueButton).toBeInTheDocument();
    const scanComponentHidden = screen.queryByText('scan-signature');
    expect(scanComponentHidden).not.toBeInTheDocument();

    await act(async () => continueButton.click());

    const scanComponentShown = screen.getByText('scan-signature');
    expect(scanComponentShown).toBeInTheDocument();
  });
});
