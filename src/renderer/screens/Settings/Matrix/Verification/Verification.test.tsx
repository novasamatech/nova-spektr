import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import Verification from './Verification';
import { useMatrix } from '@renderer/context/MatrixContext';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

jest.mock('@renderer/shared/utils/browser', () => ({
  getOperatingSystem: jest.fn().mockReturnValue('macOS'),
}));

jest.mock('@renderer/context/MatrixContext', () => ({
  useMatrix: jest.fn().mockReturnValue({
    matrix: {
      userIsVerified: false,
      verifyWithKey: jest.fn().mockReturnValue(false),
      verifyWithFile: jest.fn().mockReturnValue(true),
    },
  }),
}));

describe('screens/Settings/Matrix/Verification', () => {
  const submitFormWithString = async () => {
    const user = userEvent.setup({ delay: null });
    render(<Verification />);

    const input = screen.getByRole('textbox');
    await act(() => user.type(input, 'my secret value'));

    const submit = screen.getByRole('button', { name: 'settings.matrix.verifyDeviceButton' });
    await act(() => submit.click());
  };

  const submitFormWithFile = async () => {
    const user = userEvent.setup();
    render(<Verification />);

    const dropdown = screen.getByText('settings.matrix.verifyWithKey');
    await act(() => dropdown.click());
    const fileOption = screen.getByText('settings.matrix.uploadFile');
    await act(() => fileOption.click());

    const file = new File(['hello'], 'hello.txt', { type: 'text/plain' });
    const input = screen.getByTestId('file-input');
    await act(() => user.upload(input, file));

    const submit = screen.getByRole('button', { name: 'settings.matrix.verifyDeviceButton' });
    await act(() => submit.click());
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should render component', () => {
    render(<Verification />);

    const title = screen.getByText('settings.matrix.verificationTitle');
    const subtitle = screen.getByText('settings.matrix.verificationSubtitle');
    expect(title).toBeInTheDocument();
    expect(subtitle).toBeInTheDocument();
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
        userIsVerified: false,
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
      matrix: { userIsVerified: true },
    });
    await act(async () => {
      render(<Verification />);
    });

    const verified = screen.getByText('settings.matrix.statusVerified');
    const submit = screen.queryByRole('button', { name: 'settings.matrix.verifyDeviceButton' });
    expect(verified).toBeInTheDocument();
    expect(submit).not.toBeInTheDocument();
  });
});
