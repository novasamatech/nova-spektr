import { type EventCallable, allSettled, createWatch, fork } from 'effector';
import { describe, expect, it, vi } from 'vitest';

import { type Transaction, type Validator, TransactionType } from '@/shared/core';
import { createAccountId, createPolkadotWallet, createVaultChainAccount, polkadotChain } from '@/shared/mocks';
import { type MultisigOperation } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { transactionBuilder } from '@/entities/transaction';
import { walletModel } from '@/entities/wallet';
import { selectedWalletMultisigOperations } from '@/aggregates/selected-wallet-multisig-operations';
import { signModel } from '@/features/operations/OperationSign/model/sign-model';
import { nominateConfirmModel } from '@/features/operations/OperationsConfirm';
import { validatorSelectionModel } from '@/features/validator-selection';
import { Step } from '../lib/types';

import { nominateFlowShards } from './flow-shards';
import { formModelShards } from './form-model-shards';

// The pending-operations list depends on the selected wallet, the operations
// cache and the chain list; the flow only needs the list itself, so it is
// replaced with a store the test can seed.
vi.mock('@/aggregates/selected-wallet-multisig-operations', async () => {
  const { createStore } = await import('effector');

  return { selectedWalletMultisigOperations: { $list: createStore<unknown[]>([]) } };
});

// The picker is a singleton with a heavy UI behind it; the flow only talks to
// it through these units.
vi.mock('@/features/validator-selection', async () => {
  const { createEvent } = await import('effector');

  return {
    getSigningMode: () => 'local',
    getDraftSigningInfo: () => undefined,
    validatorSelectionModel: {
      events: { formInitiated: createEvent<unknown>(), formCleared: createEvent() },
      output: { formSubmitted: createEvent<unknown[]>() },
    },
  };
});

/**
 * The real module types `formSubmitted` as a derived event; at runtime it is
 * the callable stand-in above.
 */
const picker = validatorSelectionModel as unknown as { output: { formSubmitted: EventCallable<Validator[]> } };

const WALLET = createPolkadotWallet(1, { rootAccountId: createAccountId('root') });
const SHARDS = [
  createVaultChainAccount('shard-1', { walletId: WALLET.id, derivationPath: '//0' }),
  createVaultChainAccount('shard-2', { walletId: WALLET.id, derivationPath: '//1' }),
];

const PENDING_CALL_HASH = `0x${'78'.repeat(32)}`;

const createValidator = (seed: string) => ({ accountId: createAccountId(seed) }) as Validator;

const VALIDATORS = [createValidator('validator-1'), createValidator('validator-2')];

/** Both shards walked up to the confirm step with `VALIDATORS` picked. */
const openConfirm = async (values = new Map()) => {
  const scope = fork({
    values: values
      .set(walletModel.__test.$rawWallets, [WALLET])
      .set(networkModel.$apis, { [polkadotChain.chainId]: {} }),
  });
  const signSpy = vi.fn();
  createWatch({ unit: signModel.events.formInitiated, fn: signSpy, scope });

  await allSettled(nominateFlowShards.events.flowStarted, {
    scope,
    params: { wallet: WALLET, chain: polkadotChain, shards: SHARDS },
  });
  await allSettled(formModelShards.output.formChanged, { scope, params: { shards: SHARDS, signatory: null } });
  await allSettled(formModelShards.output.formSubmitted, { scope });
  await allSettled(picker.output.formSubmitted, { scope, params: VALIDATORS });

  return { scope, signSpy };
};

describe('nominateFlowShards · signing from the confirm step', () => {
  it('holds, for every shard, the nomination of the validators picked last and signs exactly those', async () => {
    const { scope, signSpy } = await openConfirm();

    expect(scope.getState(nominateFlowShards.$step)).toBe(Step.CONFIRM);

    const confirms = scope.getState(nominateConfirmModel.$confirms);

    expect(confirms.map((confirm) => confirm.meta.tx)).toEqual(
      SHARDS.map((shard) =>
        transactionBuilder.buildNominate({
          chain: polkadotChain,
          accountId: shard.accountId,
          nominators: VALIDATORS.map((validator) => validator.accountId),
        }),
      ),
    );
    expect(confirms.map((confirm) => confirm.meta.signatory)).toEqual(SHARDS);

    await allSettled(nominateConfirmModel.startSigning, { scope });

    expect(signSpy).toHaveBeenCalledTimes(1);

    const { signingPayloads } = signSpy.mock.calls[0]![0];

    expect(signingPayloads).toHaveLength(SHARDS.length);
    signingPayloads.forEach((payload: { transaction: Transaction; signatory: unknown }, index: number) => {
      expect(payload.transaction).toBe(confirms[index]!.meta.tx);
      expect(payload.signatory).toBe(SHARDS[index]);
    });
    expect(scope.getState(nominateFlowShards.$step)).toBe(Step.SIGN);
  });

  it('does not start signing while the confirm step holds a duplicate of a pending multisig operation', async () => {
    const pending = { status: 'pending', chainId: polkadotChain.chainId, callHash: PENDING_CALL_HASH };
    const { scope, signSpy } = await openConfirm(
      new Map().set(selectedWalletMultisigOperations.$list, [pending as unknown as MultisigOperation]),
    );

    const [confirm] = scope.getState(nominateConfirmModel.$confirms);
    const duplicate: Transaction = {
      type: TransactionType.MULTISIG_AS_MULTI,
      chainId: polkadotChain.chainId,
      accountId: SHARDS[0]!.accountId,
      args: { callHash: PENDING_CALL_HASH },
    };

    await allSettled(nominateConfirmModel.init, { scope, params: [{ ...confirm!.meta, tx: duplicate }] });

    expect(scope.getState(nominateConfirmModel.$isMultisigExists)).toBe(true);

    await allSettled(nominateConfirmModel.startSigning, { scope });

    expect(signSpy).not.toHaveBeenCalled();
    expect(scope.getState(nominateFlowShards.$step)).toBe(Step.CONFIRM);
  });
});
