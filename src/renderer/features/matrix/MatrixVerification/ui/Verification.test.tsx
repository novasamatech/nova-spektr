import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type Scope, fork } from 'effector';
import { Provider } from 'effector-react';

import { Verification } from './Verification';
import { matrixModel } from '@entities/matrix';

jest.mock('@app/providers', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

jest.mock('@shared/lib/utils', () => ({
  ...jest.requireActual('@shared/lib/utils'),
  cnTw: (...classes: string[]) => classes.join(' '),
  getOperatingSystem: jest.fn().mockReturnValue('macOS'),
}));

describe('pages/Settings/Matrix/Verification', () => {
  const submitFormWithString = async (scope?: Scope) => {
    const user = userEvent.setup({ delay: null });
    render(
      <Provider value={scope || fork()}>
        <Verification />
      </Provider>,
    );

    const input = screen.getByRole('textbox');
    await act(() => user.type(input, 'my secret value'));

    const submit = screen.getByRole('button', { name: 'settings.matrix.verifyButton' });
    await act(() => submit.click());
  };

  const submitFormWithFile = async (scope?: Scope) => {
    const user = userEvent.setup({ delay: null });
    render(
      <Provider value={scope || fork()}>
        <Verification />
      </Provider>,
    );

    const fileTab = screen.getByText('settings.matrix.verifyWithFile');
    await act(() => fileTab.click());

    const file = new File(['hello'], 'hello.txt', { type: 'text/plain' });
    const input = screen.getByTestId('file-input');
    await act(() => user.upload(input, file));

    const submit = screen.getByRole('button', { name: 'settings.matrix.verifyButton' });
    await act(() => submit.click());
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should render component', async () => {
    render(<Verification />);

    const title = screen.getByText('settings.matrix.verificationLabel');
    const tabs = screen.getByRole('tablist');

    expect(title).toBeInTheDocument();
    expect(tabs).toBeInTheDocument();
  });

  test('should secretKey submit fail with error', async () => {
    await submitFormWithString();

    const errorHint = screen.getByText('settings.matrix.secretKeyError');
    expect(errorHint).toBeInTheDocument();
  });

  test('should become verified by file', async () => {
    const scope = fork({
      values: new Map().set(matrixModel.$matrix, { verifyWithFile: jest.fn().mockReturnValue(true) }),
    });
    await submitFormWithFile(scope);

    const verified = screen.getByText('settings.matrix.statusVerified');
    const errorHint = screen.queryByText('settings.matrix.fileError');
    expect(verified).toBeInTheDocument();
    expect(errorHint).not.toBeInTheDocument();
  });

  test('should become verified by secret key', async () => {
    const scope = fork({
      values: new Map().set(matrixModel.$matrix, {
        sessionIsVerified: false,
        verifyWithKey: jest.fn().mockReturnValue(true),
      }),
    });
    await submitFormWithString(scope);

    const verified = screen.getByText('settings.matrix.statusVerified');
    const errorHint = screen.queryByText('settings.matrix.secretKeyError');
    expect(verified).toBeInTheDocument();
    expect(errorHint).not.toBeInTheDocument();
  });

  test('should be verified from the start', async () => {
    const scope = fork({
      values: new Map().set(matrixModel.$matrix, { sessionIsVerified: true }),
    });
    await act(async () => {
      render(
        <Provider value={scope}>
          <Verification />
        </Provider>,
      );
    });

    const verified = screen.getByText('settings.matrix.statusVerified');
    const submit = screen.queryByRole('button', { name: 'settings.matrix.verifyDeviceButton' });
    expect(verified).toBeInTheDocument();
    expect(submit).not.toBeInTheDocument();
  });
});
