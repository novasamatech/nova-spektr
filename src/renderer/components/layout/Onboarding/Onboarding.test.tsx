import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import Onboarding from './Onboarding';
import { useAccount } from '@renderer/services/account/accountService';

jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn(),
  Outlet: () => 'outlet',
}));

jest.mock('@renderer/services/account/accountService', () => ({
  useAccount: jest.fn(),
}));

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: () => ({
    LocaleComponent: () => <div>localeComponent</div>,
  }),
}));

describe('Onboarding', () => {
  test('should render component', async () => {
    (useAccount as jest.Mock).mockImplementation(() => ({
      addAccounts: jest.fn(),
    }));

    await act(async () => {
      render(<Onboarding />, { wrapper: MemoryRouter });
    });

    const langSwitch = screen.getByText('localeComponent');
    expect(langSwitch).toBeInTheDocument();
  });
});
