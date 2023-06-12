import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import noop from 'lodash/noop';

import MatrixModal from './MatrixModal';
import { useMatrix } from '@renderer/context/MatrixContext';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

jest.mock('@renderer/context/MatrixContext', () => ({
  useMatrix: jest.fn().mockReturnValue({
    isLoggedIn: false,
    matrix: {
      sessionIsVerified: false,
    },
  }),
}));

jest.mock('./components/LoginForm/LoginForm', () => () => <span>LoginForm</span>);
jest.mock('./components/MatrixInfoPopover/MatrixInfoPopover', () => () => <span>MatrixInfoPopover</span>);
jest.mock('./components/Credentials/Credentials', () => () => <span>Credentials</span>);
jest.mock('./components/Verification/Verification', () => () => <span>Verification</span>);

describe('screen/Settings/Matrix', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should render component', () => {
    render(<MatrixModal isOpen onClose={noop} />, { wrapper: MemoryRouter });

    const logInTitle = screen.getByText('settings.matrix.logInTitle');
    const info = screen.getByText('MatrixInfoPopover');

    expect(logInTitle).toBeInTheDocument();
    expect(info).toBeInTheDocument();
  });

  test('should render Login and Policy', () => {
    render(<MatrixModal isOpen onClose={noop} />, { wrapper: MemoryRouter });

    const login = screen.getByText('LoginForm');
    expect(login).toBeInTheDocument();
  });

  test('should render Credentials and Verification', () => {
    (useMatrix as jest.Mock).mockReturnValue({
      isLoggedIn: true,
      matrix: { sessionIsVerified: true },
    });
    render(<MatrixModal isOpen onClose={noop} />, { wrapper: MemoryRouter });

    const verifyTitleTitle = screen.getByText('settings.matrix.verificationTitle');
    const credentials = screen.getByText('Credentials');
    const verification = screen.getByText('Verification');

    expect(verifyTitleTitle).toBeInTheDocument();
    expect(credentials).toBeInTheDocument();
    expect(verification).toBeInTheDocument();
  });
});
