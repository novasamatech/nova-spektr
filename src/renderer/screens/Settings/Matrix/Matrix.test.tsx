import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { Matrix } from './Matrix';
import { useMatrix } from '@renderer/context/MatrixContext';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

jest.mock('@renderer/context/MatrixContext', () => ({
  useMatrix: jest.fn().mockReturnValue({
    isLoggedIn: false,
  }),
}));

jest.mock('./LoginForm/LoginForm', () => () => <span>LoginForm</span>);
jest.mock('./InfoSection/InfoSection', () => () => <span>InfoSection</span>);
jest.mock('./Credentials/Credentials', () => () => <span>Credentials</span>);
jest.mock('./PrivacyPolicy/PrivacyPolicy', () => () => <span>PrivacyPolicy</span>);
jest.mock('./Verification/Verification', () => () => <span>Verification</span>);

describe('screen/Settings/Matrix', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should render component', () => {
    render(<Matrix />, { wrapper: MemoryRouter });

    const title = screen.getByText('settings.title');
    const subTitle = screen.getByText('settings.matrix.subTitle');
    const info = screen.getByText('InfoSection');
    expect(title).toBeInTheDocument();
    expect(subTitle).toBeInTheDocument();
    expect(info).toBeInTheDocument();
  });

  test('should render Login and Policy', () => {
    render(<Matrix />, { wrapper: MemoryRouter });

    const login = screen.getByText('LoginForm');
    const policy = screen.getByText('PrivacyPolicy');
    expect(login).toBeInTheDocument();
    expect(policy).toBeInTheDocument();
  });

  test('should render Credentials and Verification', () => {
    (useMatrix as jest.Mock).mockReturnValue({
      isLoggedIn: true,
    });
    render(<Matrix />, { wrapper: MemoryRouter });

    const credentials = screen.getByText('Credentials');
    const verification = screen.getByText('Verification');
    expect(credentials).toBeInTheDocument();
    expect(verification).toBeInTheDocument();
  });
});
