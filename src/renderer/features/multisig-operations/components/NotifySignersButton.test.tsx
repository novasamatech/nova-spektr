import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const testState = vi.hoisted(() => {
  const stores = {
    baseUrl: Symbol('baseUrl'),
    isHealthy: Symbol('isHealthy'),
    authState: Symbol('authState'),
    backendContacts: Symbol('backendContacts'),
  };

  return {
    stores,
    values: new Map<symbol, unknown>(),
    nudge: vi.fn(),
    toastSuccess: vi.fn(),
    toastError: vi.fn(),
    toastDefault: vi.fn(),
  };
});

vi.mock('effector-react', () => ({
  useUnit: (shape: Record<string, symbol> | symbol) => {
    if (typeof shape === 'symbol') return testState.values.get(shape);

    return Object.fromEntries(Object.entries(shape).map(([key, store]) => [key, testState.values.get(store)]));
  },
}));

vi.mock('@/shared/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

vi.mock('sonner', () => ({
  toast: Object.assign((...args: unknown[]) => testState.toastDefault(...args), {
    success: (...args: unknown[]) => testState.toastSuccess(...args),
    error: (...args: unknown[]) => testState.toastError(...args),
  }),
}));

vi.mock('@/domains/backend', () => ({
  operationsService: { nudge: testState.nudge },
  nudgeErrorMessage: (error: unknown) => (error instanceof Error ? error.message : String(error)),
}));

vi.mock('@/aggregates/backend', () => ({
  backendConfigurationModel: { $backendUrl: testState.stores.baseUrl },
  authModel: { $authState: testState.stores.authState },
}));

vi.mock('@/entities/contact', () => ({
  contactModel: { $backendContacts: testState.stores.backendContacts },
}));

vi.mock('@/features/contacts', () => ({
  backendContactsModel: { $isHealthy: testState.stores.isHealthy },
}));

vi.mock('@/shared/ui', () => ({
  Button: ({ children, onClick, disabled }: { children: unknown; onClick?: () => void; disabled?: boolean }) => (
    <button disabled={disabled} onClick={onClick}>
      {children as never}
    </button>
  ),
  Icon: () => null,
}));

vi.mock('@/shared/ui-kit', () => ({
  Tooltip: Object.assign(({ children }: { children: unknown }) => children as never, {
    Trigger: ({ children }: { children: unknown }) => children as never,
    Content: () => null,
  }),
}));

import { NotifySignersButton } from './NotifySignersButton';

const SESSION_ACCOUNT = 'session-account';
const MULTISIG_ACCOUNT = 'multisig-account';

const op = (status: string, overrides: Record<string, unknown> = {}) =>
  ({
    id: 'op-1',
    status,
    multisigAccountId: MULTISIG_ACCOUNT,
    depositor: SESSION_ACCOUNT,
    events: [],
    ...overrides,
  }) as any;

function setConnected(connected: boolean) {
  testState.values.set(testState.stores.baseUrl, connected ? 'https://backend.test' : null);
  testState.values.set(testState.stores.isHealthy, connected);
  testState.values.set(testState.stores.authState, { accountId: SESSION_ACCOUNT });
  testState.values.set(testState.stores.backendContacts, [{ accountId: MULTISIG_ACCOUNT }]);
}

describe('NotifySignersButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testState.values.clear();
  });

  it('renders nothing when the backend is not connected', () => {
    setConnected(false);
    const { container } = render(<NotifySignersButton operation={op('pending')} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when the operation is not pending', () => {
    setConnected(true);
    const { container } = render(<NotifySignersButton operation={op('executed')} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when the multisig is not in the external address book', () => {
    setConnected(true);
    testState.values.set(testState.stores.backendContacts, [{ accountId: 'some-other-account' }]);

    const { container } = render(<NotifySignersButton operation={op('pending')} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('disables the button until the session account has signed the operation', () => {
    setConnected(true);

    render(<NotifySignersButton operation={op('pending', { depositor: 'someone-else' })} />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('enables the button when the session account approved via an event', () => {
    setConnected(true);
    const operation = op('pending', {
      depositor: 'someone-else',
      events: [{ accountId: SESSION_ACCOUNT, status: 'approve' }],
    });

    render(<NotifySignersButton operation={operation} />);
    expect(screen.getByRole('button')).not.toBeDisabled();
  });

  it('nudges and shows a success toast when signers are notified', async () => {
    setConnected(true);
    testState.nudge.mockResolvedValue({ notified: 2, skipped: 0, failed: 0, notifiedNames: [] });

    render(<NotifySignersButton operation={op('pending')} />);
    await userEvent.click(screen.getByRole('button'));

    expect(testState.nudge).toHaveBeenCalledWith('https://backend.test', 'op-1');
    await waitFor(() => expect(testState.toastSuccess).toHaveBeenCalledWith('operation.notifySigners.success'));
  });

  it('shows the named success toast when the backend reports who was notified', async () => {
    setConnected(true);
    testState.nudge.mockResolvedValue({ notified: 2, skipped: 0, failed: 0, notifiedNames: ['Alice', 'Bob'] });

    render(<NotifySignersButton operation={op('pending')} />);
    await userEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(testState.toastSuccess).toHaveBeenCalledWith('operation.notifySigners.successNames'));
  });

  it('shows the named partial toast when some named signers were unreachable', async () => {
    setConnected(true);
    testState.nudge.mockResolvedValue({ notified: 1, skipped: 1, failed: 0, notifiedNames: ['Alice'] });

    render(<NotifySignersButton operation={op('pending')} />);
    await userEvent.click(screen.getByRole('button'));

    await waitFor(() =>
      expect(testState.toastSuccess).toHaveBeenCalledWith('operation.notifySigners.successNamesPartial'),
    );
  });

  it('shows the neutral toast when nobody is pending', async () => {
    setConnected(true);
    testState.nudge.mockResolvedValue({ notified: 0, skipped: 0, failed: 0, notifiedNames: [] });

    render(<NotifySignersButton operation={op('pending')} />);
    await userEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(testState.toastDefault).toHaveBeenCalledWith('operation.notifySigners.nobodyPending'));
  });

  it('shows an error toast when the nudge fails', async () => {
    setConnected(true);
    testState.nudge.mockRejectedValue(new Error('boom'));

    render(<NotifySignersButton operation={op('pending')} />);
    await userEvent.click(screen.getByRole('button'));

    await waitFor(() =>
      expect(testState.toastError).toHaveBeenCalledWith('operation.notifySigners.errorTitle', { description: 'boom' }),
    );
  });

  it('shows an error toast when deliveries fail and nobody was notified', async () => {
    setConnected(true);
    testState.nudge.mockResolvedValue({ notified: 0, skipped: 0, failed: 3, notifiedNames: [] });

    render(<NotifySignersButton operation={op('pending')} />);
    await userEvent.click(screen.getByRole('button'));

    await waitFor(() =>
      expect(testState.toastError).toHaveBeenCalledWith('operation.notifySigners.errorTitle', {
        description: 'operation.notifySigners.deliveryFailed',
      }),
    );
    expect(testState.toastDefault).not.toHaveBeenCalled();
  });

  it('shows the no-Matrix-id message when every unreached signer lacks a Matrix handle', async () => {
    setConnected(true);
    testState.nudge.mockResolvedValue({ notified: 0, skipped: 2, failed: 0, unreachableNoMatrixId: 2 });

    render(<NotifySignersButton operation={op('pending')} />);
    await userEvent.click(screen.getByRole('button'));

    await waitFor(() =>
      expect(testState.toastError).toHaveBeenCalledWith('operation.notifySigners.errorTitle', {
        description: 'operation.notifySigners.errorNoMatrixId',
      }),
    );
    expect(testState.toastDefault).not.toHaveBeenCalled();
  });

  it('shows the generic delivery-failure message when only some unreached signers lack a Matrix handle', async () => {
    setConnected(true);
    testState.nudge.mockResolvedValue({ notified: 0, skipped: 2, failed: 0, unreachableNoMatrixId: 1 });

    render(<NotifySignersButton operation={op('pending')} />);
    await userEvent.click(screen.getByRole('button'));

    await waitFor(() =>
      expect(testState.toastError).toHaveBeenCalledWith('operation.notifySigners.errorTitle', {
        description: 'operation.notifySigners.deliveryFailed',
      }),
    );
    expect(testState.toastDefault).not.toHaveBeenCalled();
  });

  it('shows a partial success toast when some signers were notified and some were unreachable', async () => {
    setConnected(true);
    testState.nudge.mockResolvedValue({ notified: 2, skipped: 0, failed: 1, notifiedNames: [] });

    render(<NotifySignersButton operation={op('pending')} />);
    await userEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(testState.toastSuccess).toHaveBeenCalledWith('operation.notifySigners.successPartial'));
    expect(testState.toastDefault).not.toHaveBeenCalled();
    expect(testState.toastError).not.toHaveBeenCalled();
  });

  it('disables the button while the nudge is in flight', async () => {
    setConnected(true);
    let resolveNudge: (v: unknown) => void;
    testState.nudge.mockReturnValue(
      new Promise(r => {
        resolveNudge = r;
      }),
    );

    render(<NotifySignersButton operation={op('pending')} />);
    await userEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('button')).toBeDisabled();

    resolveNudge!({ notified: 1, skipped: 0, failed: 0, notifiedNames: [] });
    await waitFor(() => expect(screen.getByRole('button')).not.toBeDisabled());
  });
});
