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
vi.mock('../../model/unlock-flow', async () => {
  const { BN } = await import('@polkadot/util');
  const { createEvent, createStore } = await import('effector');
  const { dotAsset, polkadotChain } = await import('@/shared/mocks');

  return {
    unlockFlowModel: {
      $request: createStore({ amount: new BN(1), target: '0x02', actions: [] }),
      $isUndelegate: createStore(false),
      $chain: createStore(polkadotChain),
      $asset: createStore(dotAsset),
      $initiator: createStore({ accountId: '0x01' }),
      $signatory: createStore({ walletId: 1 }),
      $signingPath: createStore(null),
      $fee: createStore(null),
      $pendingFee: createStore(false),
      $errors: createStore([]),
      $hasMultisigAccount: createStore(false),
      $multisigDeposit: createStore(null),
      $preparing: createStore(false),
      $canSign: createStore(true),
      signingPathChanged: createEvent(),
    },
  };
});
vi.mock('@/shared/ui-entities', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  TransactionDetails: ({ children }: { children: unknown }) => children,
}));
vi.mock('@/widgets/NameResolver', () => ({ NamedAccount: () => null }));
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

describe('governance-unlock-flow Confirmation', () => {
  it('shows the duplicate alert and hides Sign while the same operation is pending', () => {
    renderConfirmation(true);

    expect(screen.getByTestId('alert')).toHaveTextContent(ALERT_TITLE);
    expect(screen.getByRole('button', { name: 'Open operations' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sign' })).not.toBeInTheDocument();
  });

  it('offers Sign without an alert when no duplicate is pending', () => {
    renderConfirmation(false);

    expect(screen.queryByTestId('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign' })).toBeInTheDocument();
  });
});
