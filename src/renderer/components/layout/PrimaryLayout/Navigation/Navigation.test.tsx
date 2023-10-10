import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import Navigation from './Navigation';

jest.mock('@renderer/app/providers', () => ({
  useI18n: jest.fn().mockReturnValue({
    LocaleComponent: () => <div>localeComponent</div>,
    t: (key: string) => key,
  }),
}));

jest.mock('@renderer/entities/multisig', () => ({
  useMultisigTx: jest.fn().mockReturnValue({
    getLiveAccountMultisigTxs: jest.fn().mockReturnValue([]),
  }),
}));

jest.mock('../Wallets/WalletMenu', () => ({
  WalletMenu: () => <div>wallets-mock</div>,
}));

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
