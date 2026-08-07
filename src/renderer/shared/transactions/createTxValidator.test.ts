import { type ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { allSettled, createStore, fork } from 'effector';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { type Balance, type BalanceId, AssetType } from '@/shared/core';
import { createAccountId, createVaultBaseAccount, dotAsset, polkadotChainId } from '@/shared/mocks';
import { type AnyAccount, type AnyTransaction, accountService, transactionService } from '@/domains/network';
import { balanceUtils } from '@/entities/balance';

import { createTxValidationStore } from './createTxValidationStore';
import { createTxValidator } from './createTxValidator';

// `basicRules` reads the chain id off the api before anything else, and the
// balance lookup keys on it, so it has to be the chain the balance belongs to.
const api = { genesisHash: { toHex: () => polkadotChainId } } as unknown as ApiPromise;

const transaction: AnyTransaction = { type: 'encoded', callData: '0x0000' } as AnyTransaction;

const signatory: AnyAccount = createVaultBaseAccount('signatory', {
  walletId: 1,
  accountId: createAccountId('validator-signatory'),
});

const balance: Balance = {
  id: balanceUtils.constructBalanceId(signatory.accountId, polkadotChainId, dotAsset.assetId),
  accountId: signatory.accountId,
  chainId: polkadotChainId,
  assetId: dotAsset.assetId,
  assetType: AssetType.NATIVE,
  free: new BN('10000000000000'),
  frozen: new BN('0'),
  reserved: new BN('0'),
  locked: [],
  transferableMode: 'legacy',
  providers: 1,
  consumers: 0,
  sufficients: 0,
  ed: new BN('10000000000'),
};

const validatorParams = {
  api,
  asset: dotAsset,
  route: [signatory],
  transaction,
  balances: { [balance.id]: balance },
};

// `findSignatory` gates on `hasPermissionToMakeActions`, which resolves through a
// DI `anyOf` that only carries registrations once features have started. Stub it so
// these cases exercise the validator's own failure handling, not the DI bootstrap.
const stubSignatory = () => vi.spyOn(accountService, 'findSignatory').mockReturnValue(signatory);

describe('createTxValidator', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // The reported shape: the node accepted the socket and then stopped answering,
  // so the very first rule's fee call rejects. Swallowing that used to resolve
  // with `errors: []` — a "valid" verdict for a transaction whose balance
  // sufficiency was never checked.
  it('reports a fatal internal error instead of an empty error list when a rule throws', async () => {
    stubSignatory();
    const failure = new Error('No response received from RPC endpoint in 60s');
    vi.spyOn(transactionService, 'getTransactionFee').mockRejectedValueOnce(failure);

    const validator = createTxValidator();

    await expect(validator(validatorParams)).resolves.toEqual({
      errors: [{ kind: 'internal', message: failure.message }],
      balanceValidationResults: [],
      available: [],
    });
  });

  it('reports a fatal internal error when a rule throws synchronously', async () => {
    const validator = createTxValidator();

    // No signatory at the end of the route — `basicRules` asserts on it.
    await expect(validator({ ...validatorParams, route: [] })).resolves.toEqual({
      errors: [{ kind: 'internal', message: 'Signatory not found' }],
      balanceValidationResults: [],
      available: [],
    });
  });

  // The consequence the fatal error exists for: the verdict is reported, so
  // validation is done — but it carries an error, so `$valid` stays false and the
  // Sign button stays disabled on a transaction nothing checked.
  it('leaves the validation store invalid when a rule throws', async () => {
    stubSignatory();
    vi.spyOn(transactionService, 'getTransactionFee').mockRejectedValue(
      new Error('No response received from RPC endpoint in 60s'),
    );

    const $transaction = createStore<AnyTransaction | null>(null);

    const { $validationDone, $valid, $errors } = createTxValidationStore({
      validator: createTxValidator(),
      params: {
        api: createStore<ApiPromise | null>(api),
        asset: createStore(dotAsset),
        route: createStore<AnyAccount[]>([signatory]),
        balances: createStore<Record<BalanceId, Balance> | null>({ [balance.id]: balance }),
        transaction: $transaction,
      },
    });

    const scope = fork();
    await allSettled($transaction, { scope, params: transaction });

    expect(scope.getState($validationDone)).toBe(true);
    expect(scope.getState($valid)).toBe(false);
    expect(scope.getState($errors)).toEqual([
      { kind: 'internal', message: 'No response received from RPC endpoint in 60s' },
    ]);
  });
});
