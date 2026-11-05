import { render, screen } from '@testing-library/react';
import { fork } from 'effector';
import { Provider } from 'effector-react';
import { MemoryRouter } from 'react-router-dom';

import { I18Provider } from '@/shared/i18n';
import { ThemeProvider } from '@/shared/ui-kit';
import { confirmModel } from '../../model/confirm';
import { Confirmation } from '../Confirmation';

// The flow model, the signing path and the fee widgets are not what these
// tests are about: their stores are replaced by plain stores the test can seed,
// and the heavy children render nothing.
vi.mock('../../model/confirm', async () => {
  const { createEvent, createStore } = await import('effector');

  return {
    confirmModel: {
      $isMultisigExists: createStore(false),
      startSigning: createEvent(),
    },
  };
});
vi.mock('../../model/claim', async () => {
  const { createEvent, createStore } = await import('effector');
  const { dotAsset, polkadotChain } = await import('@/shared/mocks');

  return {
    claimRewardsModel: {
      $requests: createStore([{ account: { accountId: '0x01' } }]),
      $skippedRequests: createStore([]),
      $plans: createStore([]),
      $allPayouts: createStore([]),
      $totalAmount: createStore('0'),
      $totalFee: createStore(null),
      $extraErrors: createStore([]),
      $canUseDraftMode: createStore(false),
      draftModeToggled: createEvent(),
      draftPathCommitted: createEvent(),
      draftPathEditStarted: createEvent(),
      draftPathEditEnded: createEvent(),
      $chain: createStore(polkadotChain),
      $asset: createStore(dotAsset),
      $initiator: createStore({ accountId: '0x01' }),
      $signatory: createStore({ walletId: 1 }),
      $signingPath: createStore(null),
      $pendingFee: createStore(false),
      $errors: createStore([]),
      $hasMultisigAccount: createStore(false),
      $multisigDeposit: createStore(null),
      $preparing: createStore(false),
      $canSign: createStore(true),
      $noRouteSigner: createStore(false),
      $canUseBasket: createStore(true),
      $isDraftMode: createStore(false),
      $isDraftPathComplete: createStore(false),
      $canSaveAsDraft: createStore(false),
      $draftSigningPath: createStore(null),
      signingPathChanged: createEvent(),
      txSaved: createEvent(),
      saveAsDraftRequested: createEvent(),
    },
  };
});
vi.mock('@/shared/ui-entities', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  TransactionDetails: ({ children }: { children: unknown }) => children,
}));
vi.mock('@/features/drafts', () => ({
  DraftFormBody: ({ children }: { children: unknown }) => children,
  DraftModeCard: () => null,
  DraftSigningPath: () => null,
}));
vi.mock('@/features/signing-path', () => ({ SigningPathSection: () => null, SigningPathInline: () => null }));
vi.mock('@/widgets/price', () => ({ AssetFiatBalance: () => null }));
vi.mock('@/widgets/transaction-fee', () => ({ FeeWithLabel: () => null, MultisigDepositFee: () => null }));

const ALERT_TITLE = 'Same transaction already exist';

const renderConfirmation = (isMultisigExists: boolean) => {
  const scope = fork({ values: new Map().set(confirmModel.$isMultisigExists, isMultisigExists) });

  render(
    <Provider value={scope}>
      <I18Provider>
        <ThemeProvider>
          <MemoryRouter>
            <Confirmation />
          </MemoryRouter>
        </ThemeProvider>
      </I18Provider>
    </Provider>,
  );
};

describe('staking-claim-rewards Confirmation', () => {
  it('shows the duplicate alert and hides Sign and the basket action while the same operation is pending', () => {
    renderConfirmation(true);

    expect(screen.getByTestId('alert')).toHaveTextContent(ALERT_TITLE);
    expect(screen.getByRole('button', { name: 'Open operations' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sign' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add to basket' })).not.toBeInTheDocument();
  });

  it('offers Sign and the basket action without an alert when no duplicate is pending', () => {
    renderConfirmation(false);

    expect(screen.queryByTestId('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add to basket' })).toBeInTheDocument();
  });
});
