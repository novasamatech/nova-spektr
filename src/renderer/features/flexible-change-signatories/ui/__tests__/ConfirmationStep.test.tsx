import { render, screen } from '@testing-library/react';
import { fork } from 'effector';
import { Provider } from 'effector-react';
import { MemoryRouter } from 'react-router-dom';

import { I18Provider } from '@/shared/i18n';
import { createAccountId, createPolkadotWallet } from '@/shared/mocks';
import { ThemeProvider } from '@/shared/ui-kit';
import { walletModel } from '@/entities/wallet';
import { confirmModel } from '../../model/confirm-model';
import { ConfirmationStep } from '../ConfirmationStep';

// The edit model, the signing path and the fee widgets are not what these tests
// are about: the models are replaced by plain stores the test can seed, and the
// heavy children render nothing.
vi.mock('../../model/change-signatories-model', async () => {
  const { createEvent, createStore } = await import('effector');
  const { createAccountId, createPolkadotWallet, polkadotChain } = await import('@/shared/mocks');

  return {
    changeSignatoriesModel: {
      $signer: createStore({ walletId: 1, accountId: createAccountId('signer') }),
      $fee: createStore('0'),
      $chain: createStore(polkadotChain),
      $initiatorWallet: createStore(createPolkadotWallet(1, { rootAccountId: createAccountId('root') })),
      $multisigDeposit: createStore('0'),
      $proxyDeposit: createStore('0'),
      $isLoading: createStore(false),
      $canSubmit: createStore(true),
      $validationPending: createStore(false),
      $errors: createStore([]),
      $isTheSameMultisig: createStore(false),
      $isEditOperationAlreadyExists: createStore(false),
      confirmGoBack: createEvent(),
    },
  };
});
vi.mock('../../model/confirm-model', async () => {
  const { createEvent, createStore } = await import('effector');

  return { confirmModel: { $isMultisigExists: createStore(false), startSigning: createEvent() } };
});
vi.mock('../components/ExecutionModeSummary', () => ({ ExecutionModeSummary: () => null }));
vi.mock('@/widgets/NameResolver', () => ({ NamedAccount: () => null }));
vi.mock('@/widgets/transaction-fee', () => ({
  Fee: () => null,
  FeeWithLabel: () => null,
  MultisigDepositFee: () => null,
  ProxyDepositLabel: () => null,
}));

const ALERT_TITLE = 'Same transaction already exist';

const wallet = createPolkadotWallet(1, { rootAccountId: createAccountId('root') });

const renderConfirmation = (isMultisigExists: boolean) => {
  const scope = fork({
    values: new Map()
      .set(confirmModel.$isMultisigExists, isMultisigExists)
      .set(walletModel.__test.$rawWallets, [wallet]),
  });

  render(
    <Provider value={scope}>
      <I18Provider>
        <ThemeProvider>
          <MemoryRouter>
            <ConfirmationStep />
          </MemoryRouter>
        </ThemeProvider>
      </I18Provider>
    </Provider>,
  );
};

describe('flexible-change-signatories ConfirmationStep', () => {
  it('shows the duplicate alert and keeps Sign disabled while the same operation is pending', () => {
    renderConfirmation(true);

    expect(screen.getByTestId('alert')).toHaveTextContent(ALERT_TITLE);
    expect(screen.getByRole('button', { name: 'Open operations' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign with Polkadot Vault' })).toBeDisabled();
  });

  it('keeps Sign enabled without an alert when no duplicate is pending', () => {
    renderConfirmation(false);

    expect(screen.queryByTestId('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign with Polkadot Vault' })).toBeEnabled();
  });
});
