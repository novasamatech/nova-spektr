import { BN_ZERO } from '@polkadot/util';
import { allSettled, createWatch, fork } from 'effector';
import { describe, expect, it, vi } from 'vitest';

import { type Transaction, TransactionType } from '@/shared/core';
import { toAddress } from '@/shared/lib/utils';
import { createAccountId, createPolkadotWallet, createVaultBaseAccount, dotAsset, polkadotChain } from '@/shared/mocks';
import { type MultisigOperation } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { selectedWalletMultisigOperations } from '@/aggregates/selected-wallet-multisig-operations';
import { signModel } from '@/features/operations/OperationSign/model/sign-model';
import { transferConfirmModel } from '@/features/operations/OperationsConfirm';
import { Step } from '../../lib/types';
import { formModel } from '../form-model';
import { transferModel } from '../transfer-model';

// The pending-operations list depends on the selected wallet, the operations
// cache and the chain list; the flow only needs the list itself, so it is
// replaced with a store the test can seed.
vi.mock('@/aggregates/selected-wallet-multisig-operations', async () => {
  const { createStore } = await import('effector');

  return { selectedWalletMultisigOperations: { $list: createStore<unknown[]>([]) } };
});

type SubmitPayload = Parameters<typeof formModel.formSubmitted>[0];

const ACCOUNT_ID = createAccountId('transfer sender');
const WALLET = createPolkadotWallet(1, { rootAccountId: ACCOUNT_ID });
const ACCOUNT = createVaultBaseAccount('sender', { walletId: WALLET.id, accountId: ACCOUNT_ID });
const DESTINATION = toAddress(createAccountId('transfer recipient'), { prefix: polkadotChain.addressPrefix });

const PENDING_CALL_HASH = `0x${'12'.repeat(32)}`;

const createTransferTx = (value: string): Transaction => ({
  type: TransactionType.TRANSFER,
  chainId: polkadotChain.chainId,
  accountId: ACCOUNT_ID,
  args: { dest: DESTINATION, value },
});

const createMultisigTx = (): Transaction => ({
  type: TransactionType.MULTISIG_AS_MULTI,
  chainId: polkadotChain.chainId,
  accountId: ACCOUNT_ID,
  args: { callHash: PENDING_CALL_HASH },
});

/** What the form hands over on submit. */
const createSubmit = (tx: Transaction, destination: string = DESTINATION) =>
  ({
    tx,
    coreTx: tx,
    initiator: ACCOUNT,
    signatory: ACCOUNT,
    destination,
    destinationChain: polkadotChain,
    route: [ACCOUNT],
    signingPath: [],
    amount: '1',
    rawAmount: '1',
    fee: BN_ZERO,
    originFee: BN_ZERO,
    destinationFee: null,
    multisigDeposit: BN_ZERO,
    balancePreservation: 'preserve',
  }) as unknown as SubmitPayload;

const setup = (values = new Map()) => {
  const scope = fork({
    values: values
      .set(walletModel.__test.$rawWallets, [WALLET])
      .set(formModel.$networkStore, { chain: polkadotChain, asset: dotAsset }),
  });
  const signSpy = vi.fn();
  createWatch({ unit: signModel.events.formInitiated, fn: signSpy, scope });

  return { scope, signSpy };
};

describe('transfer · signing from the confirm step', () => {
  it('signs the transaction the confirm step holds, not a later one from the form', async () => {
    const { scope, signSpy } = setup();
    const confirmedTx = createTransferTx('1000');

    await allSettled(formModel.formSubmitted, { scope, params: createSubmit(confirmedTx) });

    expect(scope.getState(transferModel.$step)).toBe(Step.CONFIRM);

    // The form hands over another transaction that never reaches the confirm step.
    await allSettled(formModel.formSubmitted, {
      scope,
      params: createSubmit(createTransferTx('2000'), 'not an address'),
    });

    expect(scope.getState(transferConfirmModel.$confirms)[0]!.meta.tx).toBe(confirmedTx);

    await allSettled(transferConfirmModel.startSigning, { scope });

    expect(signSpy).toHaveBeenCalledTimes(1);
    expect(signSpy.mock.calls[0]![0].signingPayloads).toHaveLength(1);
    expect(signSpy.mock.calls[0]![0].signingPayloads[0].transaction).toBe(confirmedTx);
    expect(signSpy.mock.calls[0]![0].signingPayloads[0].signatory).toBe(ACCOUNT);
    expect(scope.getState(transferModel.$step)).toBe(Step.SIGN);
  });

  it('does not start signing while the confirmed transfer duplicates a pending multisig operation', async () => {
    const pending = { status: 'pending', chainId: polkadotChain.chainId, callHash: PENDING_CALL_HASH };
    const { scope, signSpy } = setup(
      new Map()
        .set(networkModel.$apis, { [polkadotChain.chainId]: {} })
        .set(selectedWalletMultisigOperations.$list, [pending as unknown as MultisigOperation]),
    );

    await allSettled(formModel.formSubmitted, { scope, params: createSubmit(createMultisigTx()) });

    expect(scope.getState(transferModel.$step)).toBe(Step.CONFIRM);
    expect(scope.getState(transferConfirmModel.$isMultisigExists)).toBe(true);

    await allSettled(transferConfirmModel.startSigning, { scope });

    expect(signSpy).not.toHaveBeenCalled();
    expect(scope.getState(transferModel.$step)).toBe(Step.CONFIRM);
  });
});
