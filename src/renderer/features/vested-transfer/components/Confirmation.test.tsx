import { BN } from '@polkadot/util';
import { render, screen } from '@testing-library/react';
import { fork } from 'effector';
import { Provider } from 'effector-react';
import { MemoryRouter } from 'react-router-dom';

import { I18Provider } from '@/shared/i18n';
import { ThemeProvider } from '@/shared/ui-kit';
import { confirmModel } from '../model/confirm';

import { Confirmation } from './Confirmation';

// The confirm store, the vesting preview and the fee widgets are not what
// these tests are about: the store is replaced by plain stores the test can
// seed, and the heavy children render nothing.
vi.mock('../model/confirm', async () => {
  const { createEvent, createStore } = await import('effector');
  const { polkadotChain } = await import('@/shared/mocks');

  return {
    confirmModel: {
      $confirms: createStore([
        {
          meta: {
            initiator: {},
            signatory: {},
            chain: polkadotChain,
            fee: '0',
            amount: '0',
            hasMultisigAccount: false,
            multisigDeposit: new BN(0),
            vestingSchedule: [],
            issues: null,
            tx: {},
            coreTx: {},
          },
          wallets: { signatory: { type: undefined } },
        },
      ]),
      $isMultisigExists: createStore(false),
      startSigning: createEvent(),
    },
  };
});
vi.mock('@/shared/ui-entities', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  TransactionDetails: ({ children }: { children: unknown }) => children,
}));
vi.mock('@/features/operations/OperationsConfirm/common/CallDataConfirmSection', () => ({
  CallDataConfirmSection: () => null,
}));
vi.mock('@/features/operations/OperationsConfirm/common/MultisigOperationDescriptionField', () => ({
  MultisigOperationDescriptionField: () => null,
}));
vi.mock('@/widgets/vesting-schedule-preview', () => ({ VestingSchedulePreview: () => null }));
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

describe('vested-transfer Confirmation', () => {
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
