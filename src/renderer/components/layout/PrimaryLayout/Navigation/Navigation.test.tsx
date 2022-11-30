import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import Navigation from './Navigation';
import { useMatrix } from '@renderer/context/MatrixContext';
import { TEST_PUBLIC_KEY } from '@renderer/services/balance/common/constants';

jest.mock('@renderer/context/MatrixContext', () => ({
  useMatrix: jest.fn(),
}));

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    LocaleComponent: () => <div>localeComponent</div>,
    t: (key: string) => key,
  }),
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

jest.mock('../Wallets/Wallets', () => () => 'wallets-mock');

describe('layout/PrimaryLayout/Navigation', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should render component', () => {
    (useMatrix as jest.Mock).mockReturnValue({
      matrix: {
        isLoggedIn: true,
        logout: jest.fn(),
      },
      setIsLoggedIn: jest.fn(),
    });

    render(<Navigation />, { wrapper: MemoryRouter });

    const text = screen.getByText('Test Wallet');
    expect(text).toBeInTheDocument();

    const langSwitch = screen.getByText('localeComponent');
    expect(langSwitch).toBeInTheDocument();
  });
});
