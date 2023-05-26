import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import Navigation from './Navigation';
import { TEST_ACCOUNT_ID } from '@renderer/shared/utils/constants';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    LocaleComponent: () => <div>localeComponent</div>,
    t: (key: string) => key,
  }),
}));

jest.mock('@renderer/services/account/accountService', () => ({
  useAccount: jest.fn().mockReturnValue({
    getActiveAccounts: () => [{ name: 'Test Wallet', accountId: TEST_ACCOUNT_ID }],
  }),
}));

jest.mock('@renderer/services/multisigTx/multisigTxService', () => ({
  useMultisigTx: jest.fn().mockReturnValue({
    getLiveAccountMultisigTxs: jest.fn().mockReturnValue([]),
  }),
}));

jest.mock('../Wallets/Wallets', () => {
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

    const text = screen.getByText('Test Wallet');
    expect(text).toBeInTheDocument();

    const wallets = screen.getByText('wallets-mock');
    expect(wallets).toBeInTheDocument();
  });
});
