import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'effector-react';
import { fork, Scope } from 'effector';

import { LoginForm } from './LoginForm';
import { matrixModel } from '@entities/matrix';

jest.mock('react-i18next', () => ({ Trans: (props: any) => props.i18nKey }));

jest.mock('@app/providers', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('pages/Settings/Matrix/LoginForm', () => {
  const setupForm = async (scope: Scope, withCredentials = false) => {
    const user = userEvent.setup({ delay: null });

    await act(async () => {
      render(
        <Provider value={scope}>
          <LoginForm redirectStep="step" />
        </Provider>,
      );
    });

    if (withCredentials) {
      const username = await screen.findByPlaceholderText('settings.matrix.usernamePlaceholder');
      await act(() => user.type(username, 'my_username'));

      const password = screen.getByPlaceholderText('settings.matrix.passwordPlaceholder');
      await act(() => user.type(password, 'my_password'));
    }
  };

  test('should render component', async () => {
    await act(async () => {
      render(
        <Provider value={fork()}>
          <LoginForm redirectStep="step" />
        </Provider>,
      );
    });

    const homeserverInputLabel = screen.getByText('settings.matrix.homeserverLabel');
    const submit = screen.getByRole('button', { name: 'settings.matrix.logInButton' });

    expect(homeserverInputLabel).toBeInTheDocument();
    expect(submit).toBeDisabled();
  });

  test('should submit button be disabled', async () => {
    const scope = fork({
      values: new Map().set(matrixModel.$matrix, {
        loginFlows: jest.fn().mockResolvedValue({ password: true, sso: [] }),
        setHomeserver: jest.fn().mockResolvedValue({}),
        loginWithCreds: jest.fn().mockResolvedValue(Promise.resolve()),
      }),
    });

    await setupForm(scope, false);

    const button = screen.getByRole('button', { name: 'settings.matrix.logInButton' });
    waitFor(() => expect(button).toBeDisabled());
  });

  test('should disable submit button during submission', async () => {
    const scope = fork({
      values: new Map().set(matrixModel.$matrix, {
        loginFlows: jest.fn().mockResolvedValue({ password: true, sso: [] }),
        setHomeserver: jest.fn(),
        loginWithCreds: jest.fn().mockResolvedValue(Promise.resolve()),
      }),
    });

    await setupForm(scope, true);

    const button = screen.getByRole('button', { name: 'settings.matrix.logInButton' });
    expect(button).toBeEnabled();

    await act(async () => button.click());

    waitFor(() => expect(button).toBeDisabled());
  });
});
