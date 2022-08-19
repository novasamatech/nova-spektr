import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import WatchOnly from './WatchOnly';
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

describe('screens/Onboarding/WatchOnly', () => {
  test('should render component', () => {
    // TODO: Fix warning
    act(() => {
      render(<WatchOnly />, { wrapper: MemoryRouter });
    });

    const title = screen.getByRole('heading', { name: 'Add watch-only Wallet' });
    expect(title).toBeInTheDocument();
  });
});
