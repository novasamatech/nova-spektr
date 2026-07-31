import { BN } from '@polkadot/util';
import { type Scope, allSettled, fork } from 'effector';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { type Chain, type MultisigAccount, TransactionType } from '@/shared/core';
import { getCallHash } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import {
  type AnyAccount,
  type MultisigOperation,
  MultisigEventStatus,
  accounts,
  transactionService,
} from '@/domains/network';
import { networkModel } from '@/entities/network';

import { approveModel } from './approve-model';
import {
  OTHER_CHAIN_ID,
  TEST_CHAIN_ID,
  aId,
  chainScopedAccount,
  createFakeApi,
  createMultisigAccount,
  fakeWeight,
  seedDiHandlers,
  testChain,
  vaultAccount,
  watchOnlyAccount,
} from './test-helpers';

type OperationParams = {
  multisigAccountId: AccountId;
  approvers?: AccountId[];
  callData?: string | null;
  callHash?: string;
};

const createOperation = ({
  multisigAccountId,
  approvers = [],
  callData = null,
  callHash = '0xabc123',
}: OperationParams): MultisigOperation =>
  ({
    id: `${TEST_CHAIN_ID}-${callHash}-${multisigAccountId}-100-1`,
    status: 'pending',
    transaction: null,
    method: null,
    section: null,
    callHash,
    callData,
    chainId: TEST_CHAIN_ID,
    multisigAccountId,
    depositor: approvers[0] ?? multisigAccountId,
    blockCreated: 100,
    indexCreated: 1,
    events: approvers.map((accountId, index) => ({
      id: `event-${index}`,
      accountId,
      status: MultisigEventStatus.Approve,
      blockCreated: 100,
      indexCreated: index,
      timestamp: 0,
    })),
    timestamp: 0,
  }) as unknown as MultisigOperation;

type ScopeParams = {
  accountList?: (AnyAccount | MultisigAccount)[];
  withApi?: boolean;
};

const createScope = async ({ accountList = [], withApi = false }: ScopeParams = {}) => {
  const values = new Map().set(accounts.__test.$list, accountList);
  if (withApi) {
    values.set(networkModel.$apis, { [TEST_CHAIN_ID]: createFakeApi() });
  }

  const scope = fork({ values });
  await seedDiHandlers(scope);

  return scope;
};

const openFlow = (scope: Scope, operation: MultisigOperation, account: MultisigAccount, chain: Chain = testChain) => {
  return allSettled(approveModel.flow.open, { scope, params: { chain, operation, account } });
};

describe('approve model', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('signatory preselection', () => {
    it('preselects the only actionable signatory as initiator and signatory', async () => {
      const ownedSignatory = vaultAccount(aId(1));
      const multisigAccount = createMultisigAccount(aId(9), [aId(1), aId(2)]);
      const operation = createOperation({ multisigAccountId: multisigAccount.accountId });

      const scope = await createScope({ accountList: [ownedSignatory, multisigAccount] });
      await openFlow(scope, operation, multisigAccount);

      expect(scope.getState(approveModel.$unsignedAccounts)).toEqual([ownedSignatory]);
      expect(scope.getState(approveModel.$initiator)).toBe(ownedSignatory);
      expect(scope.getState(approveModel.$signatory)).toBe(ownedSignatory);
    });

    it('offers all actionable signatories without preselecting when several are eligible', async () => {
      const firstSignatory = vaultAccount(aId(1), 1);
      const secondSignatory = vaultAccount(aId(2), 2);
      const multisigAccount = createMultisigAccount(aId(9), [aId(1), aId(2)]);
      const operation = createOperation({ multisigAccountId: multisigAccount.accountId });

      const scope = await createScope({ accountList: [firstSignatory, secondSignatory, multisigAccount] });
      await openFlow(scope, operation, multisigAccount);

      expect(scope.getState(approveModel.$unsignedAccounts)).toEqual([firstSignatory, secondSignatory]);
      expect(scope.getState(approveModel.$initiator)).toBeNull();
    });

    it('honors explicit initiator selection and resolves the signatory from it', async () => {
      const firstSignatory = vaultAccount(aId(1), 1);
      const secondSignatory = vaultAccount(aId(2), 2);
      const multisigAccount = createMultisigAccount(aId(9), [aId(1), aId(2)]);
      const operation = createOperation({ multisigAccountId: multisigAccount.accountId });

      const scope = await createScope({ accountList: [firstSignatory, secondSignatory, multisigAccount] });
      await openFlow(scope, operation, multisigAccount);
      await allSettled(approveModel.selectInitiator, { scope, params: secondSignatory });

      expect(scope.getState(approveModel.$initiator)).toBe(secondSignatory);
      expect(scope.getState(approveModel.$signatory)).toBe(secondSignatory);
    });

    it('honors explicit signatory selection', async () => {
      const firstSignatory = vaultAccount(aId(1), 1);
      const secondSignatory = vaultAccount(aId(2), 2);
      const multisigAccount = createMultisigAccount(aId(9), [aId(1), aId(2)]);
      const operation = createOperation({ multisigAccountId: multisigAccount.accountId });

      const scope = await createScope({ accountList: [firstSignatory, secondSignatory, multisigAccount] });
      await openFlow(scope, operation, multisigAccount);
      await allSettled(approveModel.selectInitiator, { scope, params: secondSignatory });
      await allSettled(approveModel.selectSignatory, { scope, params: firstSignatory });

      expect(scope.getState(approveModel.$signatory)).toBe(firstSignatory);
    });

    it('excludes a signatory that already approved and preselects the remaining one', async () => {
      const firstSignatory = vaultAccount(aId(1), 1);
      const secondSignatory = vaultAccount(aId(2), 2);
      const multisigAccount = createMultisigAccount(aId(9), [aId(1), aId(2)]);
      const operation = createOperation({ multisigAccountId: multisigAccount.accountId, approvers: [aId(1)] });

      const scope = await createScope({ accountList: [firstSignatory, secondSignatory, multisigAccount] });
      await openFlow(scope, operation, multisigAccount);

      expect(scope.getState(approveModel.$unsignedAccounts)).toEqual([secondSignatory]);
      expect(scope.getState(approveModel.$initiator)).toBe(secondSignatory);
    });

    it('excludes watch-only signatory accounts', async () => {
      const watchOnlySignatory = watchOnlyAccount(aId(1), 1);
      const vaultSignatory = vaultAccount(aId(2), 2);
      const multisigAccount = createMultisigAccount(aId(9), [aId(1), aId(2)]);
      const operation = createOperation({ multisigAccountId: multisigAccount.accountId });

      const scope = await createScope({ accountList: [watchOnlySignatory, vaultSignatory, multisigAccount] });
      await openFlow(scope, operation, multisigAccount);

      expect(scope.getState(approveModel.$unsignedAccounts)).toEqual([vaultSignatory]);
      expect(scope.getState(approveModel.$initiator)).toBe(vaultSignatory);
    });

    it('excludes signatory accounts that are not available on the operation chain', async () => {
      const otherChainSignatory = chainScopedAccount(aId(1), OTHER_CHAIN_ID, 1);
      const reachableSignatory = vaultAccount(aId(2), 2);
      const multisigAccount = createMultisigAccount(aId(9), [aId(1), aId(2)]);
      const operation = createOperation({ multisigAccountId: multisigAccount.accountId });

      const scope = await createScope({ accountList: [otherChainSignatory, reachableSignatory, multisigAccount] });
      await openFlow(scope, operation, multisigAccount);

      expect(scope.getState(approveModel.$unsignedAccounts)).toEqual([reachableSignatory]);
      expect(scope.getState(approveModel.$initiator)).toBe(reachableSignatory);
    });
  });

  describe('call data requirement for signing', () => {
    const mockTransactionBoundaries = () => {
      vi.spyOn(transactionService, 'getTransactionWeight').mockResolvedValue(fakeWeight);
      vi.spyOn(transactionService, 'getSplitExtrinsicFee').mockResolvedValue(new BN(0));
      vi.spyOn(transactionService, 'wrapLegacyTransaction').mockImplementation(async transaction => ({
        ...transaction,
      }));
    };

    it('builds an executing asMulti transaction when valid call data is present', async () => {
      mockTransactionBoundaries();

      const ownedSignatory = vaultAccount(aId(1));
      const multisigAccount = createMultisigAccount(aId(9), [aId(1), aId(2)]);
      const callData = '0x0400';
      const operation = createOperation({
        multisigAccountId: multisigAccount.accountId,
        callData,
        callHash: getCallHash(callData),
      });

      const scope = await createScope({ accountList: [ownedSignatory, multisigAccount], withApi: true });
      await openFlow(scope, operation, multisigAccount);

      const transaction = scope.getState(approveModel.$transaction);
      expect(transaction).not.toBeNull();
      expect(transaction?.type).toBe(TransactionType.MULTISIG_AS_MULTI);
      expect(transaction?.accountId).toBe(ownedSignatory.accountId);
      expect(transaction?.args.call).toBe(callData);
    });

    it('builds no transaction when call data is missing — approve is blocked', async () => {
      mockTransactionBoundaries();

      const ownedSignatory = vaultAccount(aId(1));
      const multisigAccount = createMultisigAccount(aId(9), [aId(1), aId(2)]);
      const operation = createOperation({ multisigAccountId: multisigAccount.accountId, callData: null });

      const scope = await createScope({ accountList: [ownedSignatory, multisigAccount], withApi: true });
      await openFlow(scope, operation, multisigAccount);

      expect(scope.getState(approveModel.$transaction)).toBeNull();
      expect(scope.getState(approveModel.$signingPayloads)).toBeNull();
      expect(scope.getState(approveModel.$canSubmit)).toBe(false);
    });

    it('falls back to a non-executing approveAsMulti transaction when call data does not match the hash', async () => {
      mockTransactionBoundaries();

      const ownedSignatory = vaultAccount(aId(1));
      const multisigAccount = createMultisigAccount(aId(9), [aId(1), aId(2)]);
      const operation = createOperation({
        multisigAccountId: multisigAccount.accountId,
        callData: '0x0400',
        callHash: getCallHash('0xdead'),
      });

      const scope = await createScope({ accountList: [ownedSignatory, multisigAccount], withApi: true });
      await openFlow(scope, operation, multisigAccount);

      const transaction = scope.getState(approveModel.$transaction);
      expect(transaction).not.toBeNull();
      expect(transaction?.type).toBe(TransactionType.MULTISIG_APPROVE_AS_MULTI);
    });
  });

  describe('risk acknowledgement gate', () => {
    it('starts unacknowledged and follows the toggle', async () => {
      const multisigAccount = createMultisigAccount(aId(9), [aId(1)]);
      const operation = createOperation({ multisigAccountId: multisigAccount.accountId });

      const scope = fork();
      await openFlow(scope, operation, multisigAccount);

      expect(scope.getState(approveModel.$isRiskAcknowledged)).toBe(false);

      await allSettled(approveModel.riskAcknowledgedToggled, { scope, params: true });
      expect(scope.getState(approveModel.$isRiskAcknowledged)).toBe(true);

      await allSettled(approveModel.riskAcknowledgedToggled, { scope, params: false });
      expect(scope.getState(approveModel.$isRiskAcknowledged)).toBe(false);
    });

    it('resets on flow open so acknowledgement never carries across operations', async () => {
      const multisigAccount = createMultisigAccount(aId(9), [aId(1)]);
      const operation = createOperation({ multisigAccountId: multisigAccount.accountId });

      const scope = fork();
      await openFlow(scope, operation, multisigAccount);
      await allSettled(approveModel.riskAcknowledgedToggled, { scope, params: true });
      expect(scope.getState(approveModel.$isRiskAcknowledged)).toBe(true);

      await openFlow(scope, operation, multisigAccount);
      expect(scope.getState(approveModel.$isRiskAcknowledged)).toBe(false);
    });

    it('resets on flow close', async () => {
      const multisigAccount = createMultisigAccount(aId(9), [aId(1)]);
      const operation = createOperation({ multisigAccountId: multisigAccount.accountId });

      const scope = fork();
      await openFlow(scope, operation, multisigAccount);
      await allSettled(approveModel.riskAcknowledgedToggled, { scope, params: true });

      await allSettled(approveModel.flow.close, {
        scope,
        params: { chain: testChain, operation, account: multisigAccount },
      });
      expect(scope.getState(approveModel.$isRiskAcknowledged)).toBe(false);
    });
  });

  describe('description', () => {
    it('keeps the entered description for the post-sign step', async () => {
      const multisigAccount = createMultisigAccount(aId(9), [aId(1)]);
      const operation = createOperation({ multisigAccountId: multisigAccount.accountId });

      const scope = fork();
      await openFlow(scope, operation, multisigAccount);
      await allSettled(approveModel.setDescription, { scope, params: 'Payment for services' });

      expect(scope.getState(approveModel.$description)).toBe('Payment for services');
    });

    it('clears the description on a new flow open', async () => {
      const multisigAccount = createMultisigAccount(aId(9), [aId(1)]);
      const operation = createOperation({ multisigAccountId: multisigAccount.accountId });

      const scope = fork();
      await openFlow(scope, operation, multisigAccount);
      await allSettled(approveModel.setDescription, { scope, params: 'Payment for services' });

      await openFlow(scope, operation, multisigAccount);
      expect(scope.getState(approveModel.$description)).toBe('');
    });
  });
});
