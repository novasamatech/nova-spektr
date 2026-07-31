import { BN } from '@polkadot/util';
import { type Scope, allSettled, fork } from 'effector';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type MultisigAccount, TransactionType } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import {
  type AnyAccount,
  type MultisigOperation,
  MultisigEventStatus,
  accounts,
  transactionService,
} from '@/domains/network';
import { networkModel } from '@/entities/network';

import { rejectModel } from './reject-model';
import {
  TEST_CHAIN_ID,
  aId,
  createFakeApi,
  createMultisigAccount,
  seedDiHandlers,
  testChain,
  vaultAccount,
  watchOnlyAccount,
} from './test-helpers';

type OperationParams = {
  multisigAccountId: AccountId;
  depositor: AccountId;
  callHash?: string;
};

const createOperation = ({ multisigAccountId, depositor, callHash = '0xabc123' }: OperationParams): MultisigOperation =>
  ({
    id: `${TEST_CHAIN_ID}-${callHash}-${multisigAccountId}-100-1`,
    status: 'pending',
    transaction: null,
    method: null,
    section: null,
    callHash,
    callData: null,
    chainId: TEST_CHAIN_ID,
    multisigAccountId,
    depositor,
    blockCreated: 100,
    indexCreated: 1,
    events: [
      {
        id: 'event-0',
        accountId: depositor,
        status: MultisigEventStatus.Approve,
        blockCreated: 100,
        indexCreated: 0,
        timestamp: 0,
      },
    ],
    timestamp: 0,
  }) as unknown as MultisigOperation;

const createScope = async (accountList: (AnyAccount | MultisigAccount)[]) => {
  const scope = fork({
    values: new Map()
      .set(accounts.__test.$list, accountList)
      .set(networkModel.$apis, { [TEST_CHAIN_ID]: createFakeApi() }),
  });
  await seedDiHandlers(scope);

  return scope;
};

const openFlow = (scope: Scope, operation: MultisigOperation, account: MultisigAccount) => {
  return allSettled(rejectModel.flow.open, { scope, params: { chain: testChain, operation, account } });
};

describe('reject model', () => {
  beforeEach(() => {
    vi.spyOn(transactionService, 'getSplitExtrinsicFee').mockResolvedValue(new BN(0));
    vi.spyOn(transactionService, 'wrapLegacyTransaction').mockImplementation(async transaction => ({
      ...transaction,
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves the owned depositor account as initiator and assembles the cancel transaction', async () => {
    const depositorAccount = vaultAccount(aId(1));
    const multisigAccount = createMultisigAccount(aId(9), [aId(1), aId(2)]);
    const operation = createOperation({ multisigAccountId: multisigAccount.accountId, depositor: aId(1) });

    const scope = await createScope([depositorAccount, multisigAccount]);
    await openFlow(scope, operation, multisigAccount);

    expect(scope.getState(rejectModel.$multisigAccount)).toBe(multisigAccount);
    expect(scope.getState(rejectModel.$initiator)).toBe(depositorAccount);
    expect(scope.getState(rejectModel.$signatory)).toBe(depositorAccount);

    const transaction = scope.getState(rejectModel.$transaction);
    expect(transaction).not.toBeNull();
    expect(transaction?.type).toBe(TransactionType.MULTISIG_CANCEL_AS_MULTI);
    expect(transaction?.accountId).toBe(depositorAccount.accountId);
    expect(transaction?.args.callHash).toBe(operation.callHash);

    const payloads = scope.getState(rejectModel.$signingPayloads);
    expect(payloads).toHaveLength(1);
    expect(payloads?.[0]?.signatory).toBe(depositorAccount);
  });

  it('keeps reject unavailable when the depositor account is not owned', async () => {
    // aId(2) is a co-signer but not the depositor — only the depositor can reject
    const nonDepositorSignatory = vaultAccount(aId(2));
    const multisigAccount = createMultisigAccount(aId(9), [aId(1), aId(2)]);
    const operation = createOperation({ multisigAccountId: multisigAccount.accountId, depositor: aId(1) });

    const scope = await createScope([nonDepositorSignatory, multisigAccount]);
    await openFlow(scope, operation, multisigAccount);

    expect(scope.getState(rejectModel.$initiator)).toBeNull();
    expect(scope.getState(rejectModel.$signatory)).toBeNull();
    expect(scope.getState(rejectModel.$transaction)).toBeNull();
    expect(scope.getState(rejectModel.$signingPayloads)).toBeNull();
  });

  it('resolves no signatory for a watch-only depositor — nothing to sign with', async () => {
    const watchOnlyDepositor = watchOnlyAccount(aId(1));
    const multisigAccount = createMultisigAccount(aId(9), [aId(1), aId(2)]);
    const operation = createOperation({ multisigAccountId: multisigAccount.accountId, depositor: aId(1) });

    const scope = await createScope([watchOnlyDepositor, multisigAccount]);
    await openFlow(scope, operation, multisigAccount);

    expect(scope.getState(rejectModel.$signatory)).toBeNull();
    expect(scope.getState(rejectModel.$transaction)).toBeNull();
    expect(scope.getState(rejectModel.$signingPayloads)).toBeNull();
  });

  it('resets the previously built transaction when the flow reopens for another operation', async () => {
    const depositorAccount = vaultAccount(aId(1));
    const multisigAccount = createMultisigAccount(aId(9), [aId(1), aId(2)]);
    const ownOperation = createOperation({ multisigAccountId: multisigAccount.accountId, depositor: aId(1) });
    const foreignOperation = createOperation({
      multisigAccountId: multisigAccount.accountId,
      depositor: aId(2),
      callHash: '0xdef456',
    });

    const scope = await createScope([depositorAccount, multisigAccount]);
    await openFlow(scope, ownOperation, multisigAccount);
    expect(scope.getState(rejectModel.$transaction)).not.toBeNull();

    await openFlow(scope, foreignOperation, multisigAccount);
    expect(scope.getState(rejectModel.$transaction)).toBeNull();
    expect(scope.getState(rejectModel.$fee)).toBeNull();
  });
});
