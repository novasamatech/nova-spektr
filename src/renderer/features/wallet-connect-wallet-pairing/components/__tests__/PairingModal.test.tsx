import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { fork } from 'effector';
import { Provider } from 'effector-react';

import { I18Provider } from '@/shared/i18n';
import { ThemeProvider } from '@/shared/ui-kit';
import { walletConnect } from '@/features/wallet-connect-wallet';
import { EXPIRE_TIMEOUT, Step } from '../../lib/constants';
import { pairingFormModel } from '../../model/form';
import { PairingModal } from '../PairingModal';

/**
 * Sign client stub. `connect()` resolves with a uri, so the QR step renders,
 * and an `approval()` promise the test settles by hand the way the relay does.
 */
const createClientStub = () => {
  const control = { rejectApproval: (_reason: unknown) => {} };

  const client = {
    on: vi.fn(),
    extend: vi.fn(() => Promise.resolve()),
    disconnect: vi.fn(() => Promise.resolve()),
    session: { getAll: () => [] },
    pairing: { getAll: () => [] },
    core: { pairing: { updateExpiry: vi.fn(() => Promise.resolve()) } },
    connect: vi.fn(() =>
      Promise.resolve({
        uri: 'wc:stub@2?relay-protocol=irn&symKey=stub',
        approval: () =>
          new Promise((_resolve, reject) => {
            control.rejectApproval = reject;
          }),
      }),
    ),
  };

  return { client, control };
};

const Onboarding = () => (
  <>
    <PairingModal variant="novawallet">
      <button type="button">Nova Wallet</button>
    </PairingModal>
    <PairingModal variant="walletconnect">
      <button type="button">WalletConnect</button>
    </PairingModal>
  </>
);

const renderOnboarding = () =>
  render(
    <I18Provider>
      <ThemeProvider>
        <Onboarding />
      </ThemeProvider>
    </I18Provider>,
  );

const clickCard = (name: string) => fireEvent.click(screen.getByRole('button', { name }));

describe('features/wallet-connect-wallet-pairing/components/PairingModal', () => {
  let control: ReturnType<typeof createClientStub>['control'];

  beforeEach(async () => {
    const stub = createClientStub();
    control = stub.control;

    walletConnect.__test.createClient.use(() => Promise.resolve(stub.client as never));
    await act(async () => {
      await walletConnect.__test.createClient();
    });

    pairingFormModel.reset();
    pairingFormModel.flow.shut();

    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    pairingFormModel.reset();
    pairingFormModel.flow.shut();
  });

  // The modal closes itself after EXPIRE_TIMEOUT and the relay expires the proposal right after, so
  // `approval()` rejects when the modal is already gone.
  const expireProposal = async () => {
    await act(async () => {
      vi.advanceTimersByTime(EXPIRE_TIMEOUT);
    });
    await waitFor(() => expect(screen.queryByText('Scan with Nova Wallet')).not.toBeInTheDocument());

    await act(async () => {
      control.rejectApproval(new Error('Proposal expired'));
      await Promise.resolve();
    });
  };

  test('reopens the pairing modal after it was closed', async () => {
    renderOnboarding();

    clickCard('Nova Wallet');
    expect(await screen.findByText('Scan with Nova Wallet')).toBeInTheDocument();

    act(() => {
      pairingFormModel.flow.shut();
    });
    await waitFor(() => expect(screen.queryByText('Scan with Nova Wallet')).not.toBeInTheDocument());

    clickCard('Nova Wallet');
    expect(await screen.findByText('Scan with Nova Wallet')).toBeInTheDocument();
  });

  test('reopens the pairing modal after the proposal expired while it was closed', async () => {
    renderOnboarding();

    clickCard('Nova Wallet');
    expect(await screen.findByText('Scan with Nova Wallet')).toBeInTheDocument();

    await expireProposal();

    clickCard('Nova Wallet');
    expect(await screen.findByText('Scan with Nova Wallet')).toBeInTheDocument();
  });

  test('keeps WalletConnect pairing usable after a Nova Wallet proposal expired', async () => {
    renderOnboarding();

    clickCard('Nova Wallet');
    expect(await screen.findByText('Scan with Nova Wallet')).toBeInTheDocument();

    await expireProposal();

    clickCard('WalletConnect');
    expect(await screen.findByText('Scan with your mobile wallet')).toBeInTheDocument();
  });

  test('recovers after the pairing was rejected while the modal was open', async () => {
    renderOnboarding();

    clickCard('Nova Wallet');
    expect(await screen.findByText('Scan with Nova Wallet')).toBeInTheDocument();

    await act(async () => {
      control.rejectApproval(new Error('Proposal expired'));
      await Promise.resolve();
    });

    expect(await screen.findByText('Proposal expired')).toBeInTheDocument();

    fireEvent.keyDown(document.body, { key: 'Escape', code: 'Escape' });
    await waitFor(() => expect(screen.queryByText('Proposal expired')).not.toBeInTheDocument());

    clickCard('Nova Wallet');
    expect(await screen.findByText('Scan with Nova Wallet')).toBeInTheDocument();
  });

  test('keeps the card a modal trigger while a rejection sits on the model', () => {
    const scope = fork({
      values: new Map()
        .set(pairingFormModel.$step, Step.REJECT)
        .set(pairingFormModel.$error, { title: 'Proposal expired' }),
    });

    render(
      <Provider value={scope}>
        <I18Provider>
          <ThemeProvider>
            <Onboarding />
          </ThemeProvider>
        </I18Provider>
      </Provider>,
    );

    expect(screen.getByRole('button', { name: 'Nova Wallet' })).toHaveAttribute('aria-haspopup', 'dialog');
    expect(screen.getByRole('button', { name: 'WalletConnect' })).toHaveAttribute('aria-haspopup', 'dialog');
  });
});
