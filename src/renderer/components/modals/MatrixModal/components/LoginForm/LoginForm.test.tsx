import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import LoginForm from './LoginForm';

jest.mock('react-i18next', () => ({ Trans: (props: any) => props.i18nKey }));

jest.mock('@renderer/context/MatrixContext', () => ({
  useMatrix: jest.fn().mockReturnValue({
    matrix: {
      setHomeserver: jest.fn(),
      loginFlows: jest.fn().mockReturnValue(['password']),
      loginWithCreds: jest.fn(),
    },
  }),
}));

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('screen/Settings/Matrix/LoginForm', () => {
  test('should render component', () => {
    render(<LoginForm />);

    const title = screen.getByText('settings.matrix.formTitle');
    const subTitle = screen.getByText('settings.matrix.formSubtitle');
    const submit = screen.getByRole('button', { name: 'settings.matrix.signInButton' });
    expect(title).toBeInTheDocument();
    expect(subTitle).toBeInTheDocument();
    expect(submit).toBeDisabled();
  });

  test('should submit button be available', async () => {
    const user = userEvent.setup({ delay: null });

    render(<LoginForm />);

    const homeserver = screen.getByPlaceholderText('settings.matrix.homeserverPlaceholder');
    await act(() => user.type(homeserver, 'm'));
    const options = screen.getAllByText('matrix.org');
    await act(() => options[options.length - 1].click());

    const username = screen.getByPlaceholderText('settings.matrix.usernamePlaceholder');
    await act(() => user.type(username, 'my_username'));

    const password = screen.getByPlaceholderText('settings.matrix.passwordPlaceholder');
    await act(() => user.type(password, 'my_password'));

    const submit = screen.getByRole('button', { name: 'settings.matrix.signInButton' });
    expect(submit).toBeEnabled();
  });
});
