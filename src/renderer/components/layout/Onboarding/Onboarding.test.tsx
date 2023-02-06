import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import Onboarding from './Onboarding';

jest.mock('react-router-dom', () => ({
  Outlet: () => 'outlet',
}));

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: () => ({
    LocaleComponent: () => <div>localeComponent</div>,
  }),
}));

describe('Onboarding', () => {
  test('should render component', async () => {
    render(<Onboarding />, { wrapper: MemoryRouter });

    const langSwitch = screen.getByText('localeComponent');
    expect(langSwitch).toBeInTheDocument();
  });
});
