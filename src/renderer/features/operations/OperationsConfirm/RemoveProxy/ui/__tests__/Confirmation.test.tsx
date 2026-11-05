import { render, screen } from '@testing-library/react';
import { fork } from 'effector';
import { Provider } from 'effector-react';
import { MemoryRouter } from 'react-router-dom';

import { I18Provider } from '@/shared/i18n';
import { createAccountId, polkadotChain } from '@/shared/mocks';
import { ThemeProvider } from '@/shared/ui-kit';
import { confirmModel } from '../../model/confirm-model';
import { Confirmation } from '../Confirmation';

// The confirm store, the signing path and the fee widgets are not what these
// tests are about: the store is replaced by plain stores the test can seed, and
// the heavy children render nothing.
vi.mock('../../model/confirm-model', async () => {
  const { createEvent, createStore } = await import('effector');

  return {
    confirmModel: {
      $confirmStore: createStore({
        0: {
          meta: {
            chain: polkadotChain,
            signatory: {},
            spawner: createAccountId('spawner'),
            proxyType: 'Any',
            route: [],
            fee: '0',
            multisigDeposit: '0',
            tx: {},
            coreTx: {},
          },
          wallets: { signatory: { type: undefined } },
        },
      }),
      $confirms: createStore([]),
      $isMultisigExists: createStore(false),
      startSigning: createEvent(),
    },
  };
});
vi.mock('../../../common/SigningPathConfirmSection', () => ({
  SigningPathConfirmSection: () => null,
}));
vi.mock('../../../common/MultisigOperationDescriptionField', () => ({
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
            <Confirmation secondaryActionButton={<button type="button">Add to basket</button>} />
          </MemoryRouter>
        </ThemeProvider>
      </I18Provider>
    </Provider>,
  );
};

describe('RemoveProxy Confirmation', () => {
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
