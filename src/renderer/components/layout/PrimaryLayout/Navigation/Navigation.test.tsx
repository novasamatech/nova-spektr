import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import Navigation from './Navigation';
import { TEST_ACCOUNT_ID } from '@renderer/shared/lib/utils';

jest.mock('@renderer/app/providers', () => ({
  useI18n: jest.fn().mockReturnValue({
    LocaleComponent: () => <div>localeComponent</div>,
    t: (key: string) => key,
  }),
}));

jest.mock('@renderer/entities/account', () => ({
  useAccount: jest.fn().mockReturnValue({
    getActiveAccounts: () => [{ name: 'Test Wallet', accountId: TEST_ACCOUNT_ID }],
  }),
}));

jest.mock('@renderer/entities/multisig', () => ({
  useMultisigTx: jest.fn().mockReturnValue({
    getLiveAccountMultisigTxs: jest.fn().mockReturnValue([]),
  }),
}));

jest.mock('@renderer/entities/wallet', () => ({
  useWallet: jest.fn().mockReturnValue({
    getLiveWallets: jest.fn().mockReturnValue([]),
  }),
}));

jest.mock('../Wallets/WalletMenu', () => {
  const { forwardRef } = jest.requireActual('react');

  return {
    __esModule: true,
    default: forwardRef((_: any, ref: any) => <div ref={ref}>wallets-mock</div>),
  };
});

describe('layout/PrimaryLayout/Navigation', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should render component', () => {
    render(<Navigation />, { wrapper: MemoryRouter });

    const navMenu = screen.getByRole('navigation');
    expect(navMenu).toBeInTheDocument();

    const wallets = screen.getByText('wallets-mock');
    expect(wallets).toBeInTheDocument();
  });
});
