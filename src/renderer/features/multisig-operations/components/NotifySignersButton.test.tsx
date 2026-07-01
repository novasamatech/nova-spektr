import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const testState = vi.hoisted(() => {
  const stores = { baseUrl: Symbol('baseUrl'), isHealthy: Symbol('isHealthy') };

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

import { NotifySignersButton } from './NotifySignersButton';

const op = (status: string) => ({ id: 'op-1', status }) as any;

function setConnected(connected: boolean) {
  testState.values.set(testState.stores.baseUrl, connected ? 'https://backend.test' : null);
  testState.values.set(testState.stores.isHealthy, connected);
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

  it('nudges and shows a success toast when signers are notified', async () => {
    setConnected(true);
    testState.nudge.mockResolvedValue({ notified: 2, skipped: 0, failed: 0 });

    render(<NotifySignersButton operation={op('pending')} />);
    await userEvent.click(screen.getByRole('button'));

    expect(testState.nudge).toHaveBeenCalledWith('https://backend.test', 'op-1');
    await waitFor(() => expect(testState.toastSuccess).toHaveBeenCalledWith('operation.notifySigners.success'));
  });

  it('shows the neutral toast when nobody is pending', async () => {
    setConnected(true);
    testState.nudge.mockResolvedValue({ notified: 0, skipped: 0, failed: 0 });

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
    testState.nudge.mockResolvedValue({ notified: 0, skipped: 0, failed: 3 });

    render(<NotifySignersButton operation={op('pending')} />);
    await userEvent.click(screen.getByRole('button'));

    await waitFor(() =>
      expect(testState.toastError).toHaveBeenCalledWith('operation.notifySigners.errorTitle', {
        description: 'operation.notifySigners.deliveryFailed',
      }),
    );
    expect(testState.toastDefault).not.toHaveBeenCalled();
  });

  it('shows an error toast when signers were only skipped and nobody was notified', async () => {
    setConnected(true);
    testState.nudge.mockResolvedValue({ notified: 0, skipped: 2, failed: 0 });

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
    testState.nudge.mockResolvedValue({ notified: 2, skipped: 0, failed: 1 });

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

    resolveNudge!({ notified: 1, skipped: 0, failed: 0 });
    await waitFor(() => expect(screen.getByRole('button')).not.toBeDisabled());
  });
});
