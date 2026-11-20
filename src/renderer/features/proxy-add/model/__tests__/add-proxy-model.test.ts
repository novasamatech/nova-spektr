import { allSettled, createWatch, fork } from 'effector';
import { vi } from 'vitest';

import { storageService } from '@/shared/api/storage';
import { type Transaction, ConnectionStatus, TransactionType } from '@/shared/core';
import { TEST_ACCOUNTS } from '@/shared/lib/utils';
import { createVaultBaseAccount } from '@/shared/mocks';
import { type MultisigOperation } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { selectedWalletMultisigOperations } from '@/aggregates/selected-wallet-multisig-operations';
import { signModel } from '@/features/operations/OperationSign/model/sign-model';
import { submitModel } from '@/features/operations/OperationSubmit';
import { addProxyConfirmModel as confirmModel } from '@/features/operations/OperationsConfirm/AddProxy';
import { Step } from '../../lib/types';
import { addProxyModel } from '../add-proxy-model';
import { formModel } from '../form-model';

import { initiatorWallet, signerWallet, testApi, testChain } from './mock';

vi.mock('@/shared/lib/utils', async () => ({
  ...(await vi.importActual('@/shared/lib/utils')),
  getProxyTypes: jest.fn().mockReturnValue(['Any', 'Staking']),
}));

// The pending-operations list depends on the selected wallet, the operations
// cache and the chain list; the flow only needs the list itself, so it is
// replaced with a store the test can seed.
vi.mock('@/aggregates/selected-wallet-multisig-operations', async () => {
  const { createStore } = await import('effector');

  return { selectedWalletMultisigOperations: { $list: createStore<unknown[]>([]) } };
});

describe('widgets/AddProxyModal/model/add-proxy-model', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test('should go through the process of proxy create', async () => {
    jest.spyOn(storageService.proxies, 'createAll').mockResolvedValue([]);
    jest.spyOn(storageService.proxies, 'updateAll').mockResolvedValue([]);

    const scope = fork({
      values: new Map()
        .set(networkModel.$apis, { '0x00': testApi })
        .set(networkModel.$chains, { '0x00': testChain })
        .set(networkModel.$connectionStatuses, { '0x00': ConnectionStatus.CONNECTED })
        .set(walletModel.__test.$rawWallets, [initiatorWallet, signerWallet]),
    });

    await allSettled(addProxyModel.events.flowStarted, { scope, params: initiatorWallet });

    expect(scope.getState(addProxyModel.$chain)).toEqual(null);
    expect(scope.getState(addProxyModel.$step)).toEqual(Step.INIT);

    const account = createVaultBaseAccount('1', { walletId: 1, accountId: TEST_ACCOUNTS[0] });
    await allSettled(formModel.formSubmitted, {
      scope,
      params: {
        transactions: {
          wrappedTx: {} as Transaction,
          coreTx: {} as Transaction,
        },
        formData: {
          chain: testChain,
          signatory: account,
          initiator: account,
          delegate: TEST_ACCOUNTS[0],
          proxyType: 'Any',
          proxyDeposit: '1',
          proxyNumber: 1,
          fee: '1',
          multisigDeposit: '0',
          signingPath: [],
        },
      },
    });

    expect(scope.getState(addProxyModel.$step)).toEqual(Step.CONFIRM);

    await allSettled(confirmModel.startSigning, { scope });

    expect(scope.getState(addProxyModel.$step)).toEqual(Step.SIGN);

    await allSettled(signModel.output.formSubmitted, {
      scope,
      params: {
        signatures: ['0x00'],
        txPayloads: [{}] as unknown as Uint8Array[],
      },
    });

    expect(scope.getState(addProxyModel.$step)).toEqual(Step.SUBMIT);

    // @ts-expect-error TODO: fix
    const action = allSettled(submitModel.output.formSubmitted, {
      scope,
      params: {
        timepoint: {
          height: 1,
          index: 1,
        },
        extrinsicHash: '0x00',
        isFinalApprove: true,
        multisigError: '',
        proxyError: '',
      },
    });

    await jest.runAllTimersAsync();
    await action;

    // flowFinished triggers by modal window now, not model
    expect(scope.getState(addProxyModel.$step)).toEqual(Step.SUBMIT);
  });

  describe('signing from the confirm step', () => {
    const account = createVaultBaseAccount('1', { walletId: 1, accountId: TEST_ACCOUNTS[0] });
    const PENDING_CALL_HASH = `0x${'9a'.repeat(32)}`;

    const createTx = (type: TransactionType, args: Record<string, unknown>): Transaction => ({
      type,
      chainId: '0x00',
      accountId: TEST_ACCOUNTS[0],
      args,
    });

    const createSubmit = (tx: Transaction): Parameters<typeof formModel.formSubmitted>[0] => ({
      transactions: { wrappedTx: tx, coreTx: tx },
      formData: {
        chain: testChain,
        signatory: account,
        initiator: account,
        delegate: TEST_ACCOUNTS[0],
        proxyType: 'Any',
        proxyDeposit: '1',
        proxyNumber: 1,
        fee: '1',
        multisigDeposit: '0',
        signingPath: [],
      },
    });

    const openConfirm = async (tx: Transaction, operations: MultisigOperation[] = []) => {
      const scope = fork({
        values: new Map()
          .set(networkModel.$apis, { '0x00': testApi })
          .set(networkModel.$chains, { '0x00': testChain })
          .set(networkModel.$connectionStatuses, { '0x00': ConnectionStatus.CONNECTED })
          .set(walletModel.__test.$rawWallets, [initiatorWallet, signerWallet])
          .set(selectedWalletMultisigOperations.$list, operations),
      });
      const signSpy = jest.fn();
      createWatch({ unit: signModel.events.formInitiated, fn: signSpy, scope });

      await allSettled(addProxyModel.events.flowStarted, { scope, params: initiatorWallet });
      await allSettled(formModel.formSubmitted, { scope, params: createSubmit(tx) });

      return { scope, signSpy };
    };

    test('should sign the transaction the confirm step holds, not a later one from the form', async () => {
      const confirmedTx = createTx(TransactionType.ADD_PROXY, { delegate: TEST_ACCOUNTS[0] });
      const { scope, signSpy } = await openConfirm(confirmedTx);

      expect(scope.getState(addProxyModel.$step)).toEqual(Step.CONFIRM);

      // The form hands over a rebuilt transaction while the confirm step is open: the step keeps its own.
      const rebuiltTx = createTx(TransactionType.ADD_PROXY, { delegate: TEST_ACCOUNTS[0], rebuilt: true });
      await allSettled(formModel.formSubmitted, { scope, params: createSubmit(rebuiltTx) });

      expect(scope.getState(confirmModel.$confirms)[0]!.meta.tx).toBe(confirmedTx);

      await allSettled(confirmModel.startSigning, { scope });

      expect(signSpy).toHaveBeenCalledTimes(1);
      expect(signSpy.mock.calls[0]![0].signingPayloads).toHaveLength(1);
      expect(signSpy.mock.calls[0]![0].signingPayloads[0].transaction).toBe(confirmedTx);
      expect(scope.getState(addProxyModel.$step)).toEqual(Step.SIGN);

      const submitSpy = jest.fn();
      createWatch({ unit: submitModel.events.formInitiated, fn: submitSpy, scope });

      await allSettled(signModel.output.formSubmitted, {
        scope,
        params: { signatures: ['0x00'], txPayloads: [new Uint8Array()] },
      });

      expect(submitSpy).toHaveBeenCalledTimes(1);
      expect(submitSpy.mock.calls[0]![0].wrappedTxs[0]).toBe(confirmedTx);
    });

    test('should not start signing while the confirmed call duplicates a pending multisig operation', async () => {
      const pending = {
        status: 'pending',
        chainId: '0x00',
        callHash: PENDING_CALL_HASH,
      } as unknown as MultisigOperation;
      const duplicateTx = createTx(TransactionType.MULTISIG_AS_MULTI, { callHash: PENDING_CALL_HASH });
      const { scope, signSpy } = await openConfirm(duplicateTx, [pending]);

      expect(scope.getState(addProxyModel.$step)).toEqual(Step.CONFIRM);
      expect(scope.getState(confirmModel.$isMultisigExists)).toEqual(true);

      await allSettled(confirmModel.startSigning, { scope });

      expect(signSpy).not.toHaveBeenCalled();
      expect(scope.getState(addProxyModel.$step)).toEqual(Step.CONFIRM);
    });
  });
});
