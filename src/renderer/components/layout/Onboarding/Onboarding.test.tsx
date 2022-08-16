import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import Onboarding from './Onboarding';
import { useWallet } from '@renderer/services/wallet/walletService';

jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn(),
  Outlet: () => 'outlet',
}));
jest.mock('@renderer/services/wallet/walletService', () => ({
  useWallet: jest.fn(),
}));

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: () => ({
    LocaleComponent: () => <div>localeComponent</div>,
  }),
}));

describe('Onboarding', () => {
  test('should render component', async () => {
    (useWallet as jest.Mock).mockImplementation(() => ({
      addWallets: jest.fn(),
    }));

    await act(async () => {
      render(<Onboarding />, { wrapper: MemoryRouter });
    });

    const langSwitch = screen.getByText('localeComponent');
    expect(langSwitch).toBeInTheDocument();
  });
});
