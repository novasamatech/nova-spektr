import { type ApiPromise } from '@polkadot/api';
import { type StoreWritable, allSettled, createWatch, fork } from 'effector';
import { describe, expect, it, vi } from 'vitest';

import { type Transaction, TransactionType } from '@/shared/core';
import { Step } from '@/shared/lib/utils';
import {
  type TransactionStoresMock,
  createAccountId,
  createPolkadotWallet,
  createVaultBaseAccount,
  dotAsset,
  polkadotChain,
} from '@/shared/mocks';
import { type MultisigOperation } from '@/domains/network';
import { type VoteConfirm } from '@/features/operations/OperationsConfirm';

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

const { voteModal } = await import('../voteModal');
const { voteForm } = await import('../voteForm');
const { networkModel } = await import('@/entities/network');
const { walletModel } = await import('@/entities/wallet');
const { selectedWalletMultisigOperations } = await import('@/aggregates/selected-wallet-multisig-operations');
const { signModel } = await import('@/features/operations/OperationSign');
const { voteConfirmModel } = await import('@/features/operations/OperationsConfirm');

// --- fixtures ----------------------------------------------------------------

const ACCOUNT_ID = createAccountId('voter');
const WALLET = createPolkadotWallet(1, { rootAccountId: ACCOUNT_ID });
const ACCOUNT = createVaultBaseAccount('voter', { walletId: WALLET.id, accountId: ACCOUNT_ID });

const PENDING_CALL_HASH = `0x${'56'.repeat(32)}`;
const API = {} as ApiPromise;

const createTx = (type: TransactionType, args: Record<string, unknown>): Transaction => ({
  type,
  chainId: polkadotChain.chainId,
  accountId: ACCOUNT_ID,
  args,
});

const createConfirm = (tx: Transaction): VoteConfirm => ({
  api: API,
  chain: polkadotChain,
  asset: dotAsset,
  initiator: ACCOUNT,
  signatory: ACCOUNT,
  route: [ACCOUNT],
  existingVote: null,
  tx,
  coreTx: tx,
});

/** The form's wrapped transaction — a plain store under the mocked tx factory. */
const $formTx = () => voteForm.$tx as StoreWritable<Transaction | null>;

/**
 * The modal parked on the confirm step with `confirm` shown, the way a
 * submitted form leaves it.
 */
const openConfirm = async (confirm: VoteConfirm, values = new Map()) => {
  const scope = fork({
    values: values
      .set(walletModel.__test.$rawWallets, [WALLET])
      .set(networkModel.$apis, { [polkadotChain.chainId]: API }),
  });
  const signSpy = vi.fn();
  createWatch({ unit: signModel.events.formInitiated, fn: signSpy, scope });

  await allSettled(voteConfirmModel.replaceWithConfirm, { scope, params: confirm });
  await allSettled(voteModal.events.setStep, { scope, params: Step.CONFIRM });

  return { scope, signSpy };
};

// --- tests -------------------------------------------------------------------

describe('VoteModal · signing from the confirm step', () => {
  it('signs and submits the confirmed vote, not a later rebuild of it by the form', async () => {
    const confirmedTx = createTx(TransactionType.VOTE, { referendum: '1' });
    const { scope, signSpy } = await openConfirm(createConfirm(confirmedTx));
    const submitSpy = vi.fn();
    createWatch({ unit: voteConfirmModel.submitStarted, fn: submitSpy, scope });

    // The route changed under the open confirm step: the form re-wrapped the vote.
    await allSettled($formTx(), { scope, params: createTx(TransactionType.VOTE, { referendum: '1', rebuilt: true }) });

    await allSettled(voteConfirmModel.startSigning, { scope });

    expect(signSpy).toHaveBeenCalledTimes(1);
    expect(signSpy.mock.calls[0]![0].signingPayloads).toHaveLength(1);
    expect(signSpy.mock.calls[0]![0].signingPayloads[0].transaction).toBe(confirmedTx);
    expect(scope.getState(voteModal.$step)).toBe(Step.SIGN);

    await allSettled(signModel.output.formSubmitted, {
      scope,
      params: { signatures: ['0x00'], txPayloads: [new Uint8Array()] },
    });

    expect(submitSpy).toHaveBeenCalledTimes(1);
    expect(submitSpy.mock.calls[0]![0].wrappedTxs).toEqual([confirmedTx]);
    expect(submitSpy.mock.calls[0]![0].wrappedTxs[0]).toBe(confirmedTx);
  });

  it('does not start signing while the confirmed vote duplicates a pending multisig operation', async () => {
    const pending = { status: 'pending', chainId: polkadotChain.chainId, callHash: PENDING_CALL_HASH };
    const duplicate = createTx(TransactionType.MULTISIG_AS_MULTI, { callHash: PENDING_CALL_HASH });
    const { scope, signSpy } = await openConfirm(
      createConfirm(duplicate),
      new Map().set(selectedWalletMultisigOperations.$list, [pending as unknown as MultisigOperation]),
    );

    expect(scope.getState(voteConfirmModel.$isMultisigExists)).toBe(true);

    await allSettled(voteConfirmModel.startSigning, { scope });

    expect(signSpy).not.toHaveBeenCalled();
    expect(scope.getState(voteModal.$step)).toBe(Step.CONFIRM);
  });
});
