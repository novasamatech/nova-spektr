import { BN } from '@polkadot/util';
import { type StoreWritable, allSettled, createWatch, fork } from 'effector';
import { describe, expect, it, vi } from 'vitest';

import { type Transaction, TransactionType } from '@/shared/core';
import {
  type TransactionStoresMock,
  createAccountId,
  createPolkadotWallet,
  createVaultBaseAccount,
  polkadotChain,
} from '@/shared/mocks';
import { type MultisigOperation } from '@/domains/network';
import { type MultiTransferRow } from '@/entities/multi-transfer';
import { Step } from '../../types';
import { type MultiTransferConfirm } from '../confirm';

// The node is out of scope here: see `mockTransactionStores`.
const { txStores } = vi.hoisted(() => ({ txStores: { current: null as TransactionStoresMock | null } }));

vi.mock('@/shared/transactions', async (importOriginal) => {
  const { mockTransactionStores } = await import('@/shared/mocks');
  txStores.current = mockTransactionStores(await importOriginal());

  return txStores.current.module;
});

// The pending-operations list depends on the selected wallet, the operations
// cache and the chain list; the flow only needs the list itself, so it is
// replaced with a store the test can seed.
vi.mock('@/aggregates/selected-wallet-multisig-operations', async () => {
  const { createStore } = await import('effector');

  return { selectedWalletMultisigOperations: { $list: createStore<unknown[]>([]) } };
});

const { formModel } = await import('../form');
const { confirmModel } = await import('../confirm');
const { networkModel } = await import('@/entities/network');
const { walletModel } = await import('@/entities/wallet');
const { selectedWalletMultisigOperations } = await import('@/aggregates/selected-wallet-multisig-operations');
const { signModel } = await import('@/features/operations/OperationSign');

// --- fixtures ----------------------------------------------------------------

const ACCOUNT_ID = createAccountId('multi transfer sender');
const WALLET = createPolkadotWallet(1, { rootAccountId: ACCOUNT_ID });
const ACCOUNT = createVaultBaseAccount('sender', { walletId: WALLET.id, accountId: ACCOUNT_ID });

const PENDING_CALL_HASH = `0x${'34'.repeat(32)}`;

const TRANSFERS: MultiTransferRow[] = [
  { recipient: { raw: 'recipient', parsed: createAccountId('recipient') }, amount: { raw: '1', parsed: new BN(1) } },
];

const createTx = (type: TransactionType, args: Record<string, unknown>): Transaction => ({
  type,
  chainId: polkadotChain.chainId,
  accountId: ACCOUNT_ID,
  args,
});

const createConfirm = (tx: Transaction): MultiTransferConfirm => ({
  chain: polkadotChain,
  tx,
  coreTx: tx,
  initiator: ACCOUNT,
  signatory: ACCOUNT,
  route: [ACCOUNT],
  fee: '0',
  amount: '1',
  hasMultisigAccount: false,
  multisigDeposit: new BN(0),
  transfers: TRANSFERS,
  issues: null,
});

/** The form's wrapped transaction — a plain store under the mocked tx factory. */
const $formTx = () => formModel.$tx as StoreWritable<Transaction | null>;

/** A filled form parked on the confirm step, with `confirm` shown there. */
const openConfirm = async (confirm: MultiTransferConfirm, values = new Map()) => {
  const scope = fork({
    values: values
      .set(walletModel.__test.$rawWallets, [WALLET])
      .set(networkModel.$apis, { [polkadotChain.chainId]: {} }),
  });
  const signSpy = vi.fn();
  createWatch({ unit: signModel.events.formInitiated, fn: signSpy, scope });

  await allSettled(formModel.form.fields.chain.change, { scope, params: polkadotChain });
  await allSettled(formModel.form.fields.initiator.change, { scope, params: ACCOUNT });
  await allSettled(formModel.form.fields.signatory.change, { scope, params: ACCOUNT });
  await allSettled(formModel.form.fields.transfers.change, { scope, params: TRANSFERS });
  await allSettled(confirmModel.init, { scope, params: [confirm] });
  await allSettled(formModel.stepChanged, { scope, params: Step.CONFIRM });

  return { scope, signSpy };
};

// --- tests -------------------------------------------------------------------

describe('multi-transfer · signing from the confirm step', () => {
  it('signs the rebuilt batch only after the open confirm step took it over', async () => {
    const opened = createTx(TransactionType.BATCH_ALL, { transactions: [] });
    const { scope, signSpy } = await openConfirm(createConfirm(opened));

    // The route changed under the open confirm step: the form re-wrapped the batch.
    const rebuilt = createTx(TransactionType.BATCH_ALL, { transactions: [], rebuilt: true });
    await allSettled($formTx(), { scope, params: rebuilt });

    expect(scope.getState(confirmModel.$confirms)[0]!.meta.tx).toBe(rebuilt);

    await allSettled(confirmModel.startSigning, { scope });

    expect(signSpy).toHaveBeenCalledTimes(1);
    expect(signSpy.mock.calls[0]![0].signingPayloads).toHaveLength(1);
    expect(signSpy.mock.calls[0]![0].signingPayloads[0].transaction).toBe(rebuilt);
    expect(scope.getState(formModel.$step)).toBe(Step.SIGN);
  });

  it('keeps signing what was confirmed when the form rebuilds the batch after the confirm step', async () => {
    const opened = createTx(TransactionType.BATCH_ALL, { transactions: [] });
    const { scope, signSpy } = await openConfirm(createConfirm(opened));

    await allSettled(formModel.stepChanged, { scope, params: Step.INIT });
    await allSettled($formTx(), {
      scope,
      params: createTx(TransactionType.BATCH_ALL, { transactions: [], rebuilt: true }),
    });
    await allSettled(formModel.stepChanged, { scope, params: Step.CONFIRM });

    expect(scope.getState(confirmModel.$confirms)[0]!.meta.tx).toBe(opened);

    await allSettled(confirmModel.startSigning, { scope });

    expect(signSpy.mock.calls[0]![0].signingPayloads[0].transaction).toBe(opened);
  });

  it('does not start signing while the confirmed batch duplicates a pending multisig operation', async () => {
    const pending = { status: 'pending', chainId: polkadotChain.chainId, callHash: PENDING_CALL_HASH };
    const duplicate = createTx(TransactionType.MULTISIG_AS_MULTI, { callHash: PENDING_CALL_HASH });
    const { scope, signSpy } = await openConfirm(
      createConfirm(duplicate),
      new Map().set(selectedWalletMultisigOperations.$list, [pending as unknown as MultisigOperation]),
    );

    expect(scope.getState(confirmModel.$isMultisigExists)).toBe(true);

    await allSettled(confirmModel.startSigning, { scope });

    expect(signSpy).not.toHaveBeenCalled();
    expect(scope.getState(formModel.$step)).toBe(Step.CONFIRM);
  });
});
