import { render, screen } from '@testing-library/react';
import { fork } from 'effector';
import { Provider } from 'effector-react';
import { MemoryRouter } from 'react-router-dom';

import { I18Provider } from '@/shared/i18n';
import { ThemeProvider } from '@/shared/ui-kit';
import { confirmModel } from '@/features/operations/OperationsConfirm/VerifyProxy/model/confirm-model';
import { VerifyProxyConfirmation } from '../VerifyProxyConfirmation';

// The confirm store, the signing path and the fee widgets are not what these
// tests are about: the store is replaced by plain stores the test can seed, and
// the heavy children render nothing.
vi.mock('@/features/operations/OperationsConfirm/VerifyProxy/model/confirm-model', async () => {
  const { createEvent, createStore } = await import('effector');

  return {
    confirmModel: {
      $confirmStore: createStore(null),
      $confirms: createStore([]),
      $isMultisigExists: createStore(false),
      startSigning: createEvent(),
    },
  };
});
vi.mock('../../model/verify-proxy-model', async () => {
  const { createStore } = await import('effector');
  const { createAccountId, polkadotChain } = await import('@/shared/mocks');

  return {
    verifyProxyModel: {
      $confirmMeta: createStore({
        chain: polkadotChain,
        initiator: {},
        signatory: {},
        route: [],
        fee: '0',
        multisigDeposit: '0',
        proxyType: 'Any',
        pureProxyAccountId: createAccountId('pure'),
        tx: {},
        coreTx: {},
      }),
      $pendingFee: createStore(false),
      $fee: createStore(null),
      $multisigDeposit: createStore(null),
    },
  };
});
vi.mock('@/features/operations/OperationsConfirm/common/SigningPathConfirmSection', () => ({
  SigningPathConfirmSection: () => null,
}));
vi.mock('@/features/operations/OperationsConfirm/common/MultisigOperationDescriptionField', () => ({
  MultisigOperationDescriptionField: () => null,
}));
vi.mock('@/widgets/NameResolver', () => ({ NamedAccount: () => null }));
vi.mock('@/widgets/transaction-fee', () => ({ FeeWithLabel: () => null, MultisigDepositFee: () => null }));

const ALERT_TITLE = 'Same transaction already exist';

const renderConfirmation = (isMultisigExists: boolean) => {
  const scope = fork({ values: new Map().set(confirmModel.$isMultisigExists, isMultisigExists) });

  render(
    <Provider value={scope}>
      <I18Provider>
        <ThemeProvider>
          <MemoryRouter>
            <VerifyProxyConfirmation secondaryActionButton={<button type="button">Add to basket</button>} />
          </MemoryRouter>
        </ThemeProvider>
      </I18Provider>
    </Provider>,
  );
};

describe('VerifyProxy Confirmation', () => {
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
