import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Verification } from '../Verification';
import { useMatrix } from '@app/providers';

jest.mock('@app/providers', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
  useMatrix: jest.fn().mockReturnValue({
    matrix: {
      sessionIsVerified: false,
      verifyWithKey: jest.fn().mockReturnValue(false),
      verifyWithFile: jest.fn().mockReturnValue(true),
    },
  }),
}));

jest.mock('@shared/lib/utils', () => ({
  ...jest.requireActual('@shared/lib/utils'),
  cnTw: (...classes: string[]) => classes.join(' '),
  getOperatingSystem: jest.fn().mockReturnValue('macOS'),
}));

describe('pages/Settings/Matrix/Verification', () => {
  const submitFormWithString = async () => {
    const user = userEvent.setup({ delay: null });
    render(<Verification />);

    const input = screen.getByRole('textbox');
    await act(() => user.type(input, 'my secret value'));

    const submit = screen.getByRole('button', { name: 'settings.matrix.verifyButton' });
    await act(() => submit.click());
  };

  const submitFormWithFile = async () => {
    const user = userEvent.setup();
    render(<Verification />);

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

  test('should render component', () => {
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
    await submitFormWithFile();

    const verified = screen.getByText('settings.matrix.statusVerified');
    const errorHint = screen.queryByText('settings.matrix.fileError');
    expect(verified).toBeInTheDocument();
    expect(errorHint).not.toBeInTheDocument();
  });

  test('should become verified by secret key', async () => {
    (useMatrix as jest.Mock).mockReturnValue({
      matrix: {
        sessionIsVerified: false,
        verifyWithKey: jest.fn().mockReturnValue(true),
      },
    });
    await submitFormWithString();

    const verified = screen.getByText('settings.matrix.statusVerified');
    const errorHint = screen.queryByText('settings.matrix.secretKeyError');
    expect(verified).toBeInTheDocument();
    expect(errorHint).not.toBeInTheDocument();
  });

  test('should be verified from the start', async () => {
    (useMatrix as jest.Mock).mockReturnValue({
      matrix: { sessionIsVerified: true },
    });
    render(<Verification />);

    const verified = screen.getByText('settings.matrix.statusVerified');
    const submit = screen.queryByRole('button', { name: 'settings.matrix.verifyDeviceButton' });
    expect(verified).toBeInTheDocument();
    expect(submit).not.toBeInTheDocument();
  });
});
