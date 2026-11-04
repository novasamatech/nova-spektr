import { ApiPromise } from '@polkadot/api';
import { MockProvider } from '@polkadot/rpc-provider/mock';
import { TypeRegistry } from '@polkadot/types';
import { render, screen } from '@testing-library/react';
import { allSettled, fork } from 'effector';
import { Provider } from 'effector-react';
import { MemoryRouter } from 'react-router-dom';

import { type Transaction, AccountType, TransactionType } from '@/shared/core';
import { I18Provider } from '@/shared/i18n';
import { createAccountId, createPolkadotWallet, createVaultBaseAccount, polkadotChain } from '@/shared/mocks';
import { ThemeProvider } from '@/shared/ui-kit';
import { type AnyAccount, type MultisigOperation, accounts } from '@/domains/network';
// eslint-disable-next-line boundaries/entry-point -- test-only runtime metadata fixture, not part of the domain API
import { metadata } from '@/domains/network/transaction/service.mocks';
import { networkModel } from '@/entities/network';
import { getExtrinsic } from '@/entities/transaction';
import { walletModel } from '@/entities/wallet';
import { selectedWalletMultisigOperations } from '@/aggregates/selected-wallet-multisig-operations';
import { type AddProxyConfirm, confirmModel } from '../../model/confirm-model';
import { Confirmation } from '../Confirmation';

// The aggregate behind the pending-operations list depends on the selected
// wallet, the operations cache and the chain list; the confirm screen only
// needs the list itself, so it is replaced with a store the test can seed.
vi.mock('@/aggregates/selected-wallet-multisig-operations', async () => {
  const { createStore } = await import('effector');

  return { selectedWalletMultisigOperations: { $list: createStore<unknown[]>([]) } };
});

const ALERT_TITLE = 'Same transaction already exist';
const ALERT_DESCRIPTION =
  "Due to the blockchain limitations, multisig operations with identical details can't be in a signing status simultaneously. Wait for the current one to be signed or reject it to create a new one.";
const SIGN_BUTTON = 'Sign with Polkadot Vault';

const WALLET_ID = 1;
const wallet = createPolkadotWallet(WALLET_ID, { rootAccountId: createAccountId('root') });
const signatory = createVaultBaseAccount('signatory', { walletId: WALLET_ID, accountId: createAccountId('signatory') });

const FLEXIBLE_ACCOUNT_ID = createAccountId('flexible');

const flexibleMultisig = {
  ...signatory,
  accountId: FLEXIBLE_ACCOUNT_ID,
  multisigAccountId: createAccountId('multisig'),
  accountType: AccountType.FLEX_MULTISIG,
} as unknown as AnyAccount;

const coreTx: Transaction = {
  type: TransactionType.TRANSFER,
  chainId: polkadotChain.chainId,
  accountId: FLEXIBLE_ACCOUNT_ID,
  args: { dest: createAccountId('destination'), value: '1000' },
};

describe('AddProxy Confirmation with a pending multisig duplicate', () => {
  let api: ApiPromise;

  beforeAll(async () => {
    const registry = new TypeRegistry();
    const provider = new MockProvider(registry);
    const genesisHash = registry.createType('Hash', await provider.send('chain_getBlockHash', [])).toHex();

    api = await ApiPromise.create({ metadata: { [`${genesisHash}-0`]: metadata }, provider, registry });
  });

  afterAll(async () => {
    await api.disconnect();
  });

  // Mirrors the flexible multisig wrapper: asMulti carries proxy.proxy(flexible, coreTx).
  const createFlexibleMultisigTx = () => {
    const proxyCall = api.tx.proxy.proxy(FLEXIBLE_ACCOUNT_ID, 'Any', getExtrinsic[coreTx.type](coreTx.args, api));

    const tx: Transaction = {
      type: TransactionType.MULTISIG_AS_MULTI,
      chainId: polkadotChain.chainId,
      accountId: FLEXIBLE_ACCOUNT_ID,
      args: { call: proxyCall.method.toHex(), callHash: proxyCall.method.hash.toHex() },
    };

    return { tx, proxyCallHash: proxyCall.method.hash.toHex() };
  };

  const createPendingOperation = (callHash: string) =>
    ({ status: 'pending', callHash, chainId: polkadotChain.chainId }) as unknown as MultisigOperation;

  const createConfirm = (tx: Transaction): AddProxyConfirm => ({
    initiator: flexibleMultisig,
    signatory,
    route: [flexibleMultisig, signatory],
    chain: polkadotChain,
    tx,
    coreTx,
    proxyType: 'Any',
    delegate: createAccountId('delegate'),
    fee: '100',
    multisigDeposit: '200',
    proxyDeposit: '300',
    proxyNumber: 1,
  });

  const renderConfirmation = async (tx: Transaction, operations: MultisigOperation[]) => {
    const scope = fork({
      values: new Map()
        .set(networkModel.$apis, { [polkadotChain.chainId]: api })
        .set(walletModel.__test.$rawWallets, [wallet])
        .set(accounts.__test.$list, [flexibleMultisig, signatory])
        .set(selectedWalletMultisigOperations.$list, operations),
    });

    await allSettled(confirmModel.init, { scope, params: [createConfirm(tx)] });

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

    return scope;
  };

  it('SP-59: shows the duplicate alert and hides the Sign button while the same flexible multisig call is pending', async () => {
    const { tx, proxyCallHash } = createFlexibleMultisigTx();

    const scope = await renderConfirmation(tx, [createPendingOperation(proxyCallHash)]);

    expect(scope.getState(confirmModel.$isMultisigExists)).toBe(true);

    const alert = screen.getByTestId('alert');
    expect(alert).toHaveTextContent(ALERT_TITLE);
    expect(alert).toHaveTextContent(ALERT_DESCRIPTION);
    expect(screen.getByRole('button', { name: 'Open operations' })).toBeInTheDocument();

    expect(screen.queryByRole('button', { name: SIGN_BUTTON })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sign' })).not.toBeInTheDocument();
  });

  it('SP-59: offers the Sign button without an alert when the pending operation carries a different call', async () => {
    const { tx } = createFlexibleMultisigTx();
    const otherCall = getExtrinsic[coreTx.type]({ ...coreTx.args, value: '2000' }, api);

    const scope = await renderConfirmation(tx, [createPendingOperation(otherCall.method.hash.toHex())]);

    expect(scope.getState(confirmModel.$isMultisigExists)).toBe(false);

    expect(screen.queryByTestId('alert')).not.toBeInTheDocument();
    expect(screen.queryByText(ALERT_TITLE)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: SIGN_BUTTON })).toBeInTheDocument();
  });
});
