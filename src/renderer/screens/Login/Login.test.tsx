import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { useMatrix } from '@renderer/context/MatrixContext';
import Login from './Login';

jest.mock('@renderer/context/MatrixContext', () => ({
  useMatrix: jest.fn(),
}));

jest.mock('@renderer/services/matrix', () => ({
  BASE_MATRIX_URL: '',
}));

describe('Login', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should render component', async () => {
    (useMatrix as jest.Mock).mockReturnValue({
      matrix: {
        setHomeserver: jest.fn(),
        loginWithCreds: jest.fn(),
        skipLogin: jest.fn(),
      },
      setIsLoggedIn: jest.fn(),
    });

    await act(async () => {
      render(<Login />, { wrapper: MemoryRouter });
    });

    const title = screen.getByText('Welcome to Omni Enterprise!');
    const homeserver = screen.getByPlaceholderText('Matrix homeserver');
    const username = screen.getByPlaceholderText('Username');
    const password = screen.getByPlaceholderText('Password');
    expect(title).toBeInTheDocument();
    expect(homeserver).toBeInTheDocument();
    expect(username).toBeInTheDocument();
    expect(password).toBeInTheDocument();
  });
});
