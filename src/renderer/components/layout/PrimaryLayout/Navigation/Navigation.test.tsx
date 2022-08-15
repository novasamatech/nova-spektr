import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import Navigation from './Navigation';
import { useMatrix } from '@renderer/context/MatrixContext';

jest.mock('@renderer/context/MatrixContext', () => ({
  useMatrix: jest.fn(),
}));

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    LocaleComponent: () => <div>localeComponent</div>,
  }),
}));

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

    const text = screen.getByText('$1,148.14');
    expect(text).toBeInTheDocument();

    const langSwitch = screen.getByText('localeComponent');
    expect(langSwitch).toBeInTheDocument();
  });
});
