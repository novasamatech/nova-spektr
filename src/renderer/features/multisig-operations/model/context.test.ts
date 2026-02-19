import { allSettled, fork } from 'effector';
import { describe, expect, it, vi } from 'vitest';

// Mock components that cause circular dependency issues
vi.mock('../components/Operation', () => ({
  operationTitleTransformer: { createTransformer: () => {} },
}));

import { type MultisigAccount } from '@/shared/core';
import { createAccountId, polkadotChainId } from '@/shared/mocks';
import { accounts, multisigOperation } from '@/domains/network';

import { operationsContextModel } from './context';
import { deepLinkModel } from './deep-link';

describe('operations context model', () => {
  const mockAccountId = createAccountId(1);

  const mockMultisigAccount = {
    id: '1',
    walletId: 1,
    name: 'Test Multisig',
    accountId: mockAccountId,
    accountType: 'multisig',
    type: 'universal',
    cryptoType: 0,
    signingType: 'signing',
    signatories: [],
    threshold: 2,
    createdAt: 0,
  } as unknown as MultisigAccount;

  const createMockOperation = (status: 'pending' | 'executed' | 'cancelled' | 'error', callHash = '0xabc123') => {
    const operationId = `${polkadotChainId}-${callHash}-${mockAccountId}-100-1`;
    return {
      id: operationId,
      status,
      transaction: null,
      method: null,
      section: null,
      callHash: callHash as any,
      callData: null,
      chainId: polkadotChainId,
      accountId: mockAccountId,
      depositor: mockAccountId,
      blockCreated: 100 as any,
      indexCreated: 1,
      events: [],
      timestamp: Date.now(),
    };
  };

  describe('Tab switching based on focused operation', () => {
    it('should switch to pending tab when focused operation is pending', async () => {
      const mockOperation = createMockOperation('pending');

      const scope = fork({
        values: new Map()
          .set(multisigOperation.__test.$cachedOperations, [mockOperation])
          .set(operationsContextModel.$tab, 'history'),
      });

      await allSettled(deepLinkModel.$focusedOperationId, {
        scope,
        params: mockOperation.id,
      });

      expect(scope.getState(operationsContextModel.$tab)).toBe('pending');
    });

    it('should switch to history tab when focused operation is executed', async () => {
      const mockOperation = createMockOperation('executed');

      const scope = fork({
        values: new Map()
          .set(multisigOperation.__test.$cachedOperations, [mockOperation])
          .set(operationsContextModel.$tab, 'pending'),
      });

      await allSettled(deepLinkModel.$focusedOperationId, {
        scope,
        params: mockOperation.id,
      });

      expect(scope.getState(operationsContextModel.$tab)).toBe('history');
    });

    it('should switch to history tab when focused operation is cancelled', async () => {
      const mockOperation = createMockOperation('cancelled');

      const scope = fork({
        values: new Map()
          .set(multisigOperation.__test.$cachedOperations, [mockOperation])
          .set(operationsContextModel.$tab, 'pending'),
      });

      await allSettled(deepLinkModel.$focusedOperationId, {
        scope,
        params: mockOperation.id,
      });

      expect(scope.getState(operationsContextModel.$tab)).toBe('history');
    });

    it('should switch to history tab when focused operation has error status', async () => {
      const mockOperation = createMockOperation('error');

      const scope = fork({
        values: new Map()
          .set(multisigOperation.__test.$cachedOperations, [mockOperation])
          .set(operationsContextModel.$tab, 'pending'),
      });

      await allSettled(deepLinkModel.$focusedOperationId, {
        scope,
        params: mockOperation.id,
      });

      expect(scope.getState(operationsContextModel.$tab)).toBe('history');
    });

    it('should not change tab when focusedOperationId is null', async () => {
      const scope = fork({
        values: new Map()
          .set(multisigOperation.__test.$cachedOperations, [])
          .set(operationsContextModel.$tab, 'pending'),
      });

      await allSettled(deepLinkModel.$focusedOperationId, {
        scope,
        params: null,
      });

      expect(scope.getState(operationsContextModel.$tab)).toBe('pending');
    });

    it('should default to history tab when operation is not found', async () => {
      const scope = fork({
        values: new Map()
          .set(multisigOperation.__test.$cachedOperations, [])
          .set(operationsContextModel.$tab, 'pending'),
      });

      await allSettled(deepLinkModel.$focusedOperationId, {
        scope,
        params: 'non-existent-operation-id',
      });

      // When operation is not found, defaults to 'history' (since status !== 'pending')
      expect(scope.getState(operationsContextModel.$tab)).toBe('history');
    });

    it('should switch to hidden tab when focused operation is hidden', async () => {
      const mockOperation = createMockOperation('pending');

      const scope = fork({
        values: new Map()
          .set(multisigOperation.__test.$cachedOperations, [mockOperation])
          .set(operationsContextModel.$hiddenOperationIds, [mockOperation.id])
          .set(operationsContextModel.$tab, 'pending'),
      });

      await allSettled(deepLinkModel.$focusedOperationId, {
        scope,
        params: mockOperation.id,
      });

      expect(scope.getState(operationsContextModel.$tab)).toBe('hidden');
    });
  });

  describe('Hidden operations', () => {
    it('should add operation to hidden list when hideOperation is called', async () => {
      const mockOperation = createMockOperation('pending');

      const scope = fork({
        values: new Map()
          .set(multisigOperation.__test.$cachedOperations, [mockOperation])
          .set(operationsContextModel.$hiddenOperationIds, []),
      });

      await allSettled(operationsContextModel.hideOperation, {
        scope,
        params: mockOperation.id,
      });

      expect(scope.getState(operationsContextModel.$hiddenOperationIds)).toContain(mockOperation.id);
    });

    it('should remove operation from hidden list when unhideOperation is called', async () => {
      const mockOperation = createMockOperation('pending');

      const scope = fork({
        values: new Map()
          .set(multisigOperation.__test.$cachedOperations, [mockOperation])
          .set(operationsContextModel.$hiddenOperationIds, [mockOperation.id]),
      });

      await allSettled(operationsContextModel.unhideOperation, {
        scope,
        params: mockOperation.id,
      });

      expect(scope.getState(operationsContextModel.$hiddenOperationIds)).not.toContain(mockOperation.id);
    });

    it('should not add duplicate operation to hidden list', async () => {
      const mockOperation = createMockOperation('pending');

      const scope = fork({
        values: new Map()
          .set(multisigOperation.__test.$cachedOperations, [mockOperation])
          .set(operationsContextModel.$hiddenOperationIds, [mockOperation.id]),
      });

      await allSettled(operationsContextModel.hideOperation, {
        scope,
        params: mockOperation.id,
      });

      const hiddenIds = scope.getState(operationsContextModel.$hiddenOperationIds);
      expect(hiddenIds.filter(id => id === mockOperation.id)).toHaveLength(1);
    });

    it('should exclude hidden operations from pending tab', async () => {
      const pendingOp1 = createMockOperation('pending', '0xabc');
      const pendingOp2 = createMockOperation('pending', '0xdef');

      const scope = fork({
        values: new Map()
          .set(multisigOperation.__test.$cachedOperations, [pendingOp1, pendingOp2])
          .set(operationsContextModel.$hiddenOperationIds, [pendingOp1.id])
          .set(operationsContextModel.$tab, 'pending')
          .set(accounts.__test.$populated, true)
          .set(accounts.__test.$list, [mockMultisigAccount]),
      });

      const filtered = scope.getState(operationsContextModel.$filteredOperations);
      expect(filtered).toHaveLength(1);
      expect(filtered?.[0]?.operation.id).toBe(pendingOp2.id);
    });

    it('should show only hidden operations in hidden tab', async () => {
      const pendingOp = createMockOperation('pending', '0xabc');
      const hiddenOp = createMockOperation('executed', '0xdef');

      const scope = fork({
        values: new Map()
          .set(multisigOperation.__test.$cachedOperations, [pendingOp, hiddenOp])
          .set(operationsContextModel.$hiddenOperationIds, [hiddenOp.id])
          .set(operationsContextModel.$tab, 'hidden')
          .set(accounts.__test.$populated, true)
          .set(accounts.__test.$list, [mockMultisigAccount]),
      });

      const filtered = scope.getState(operationsContextModel.$filteredOperations);
      expect(filtered).toHaveLength(1);
      expect(filtered?.[0]?.operation.id).toBe(hiddenOp.id);
    });

    it('should calculate hidden operations count correctly', async () => {
      const op1 = createMockOperation('pending', '0xabc');
      const op2 = createMockOperation('executed', '0xdef');
      const op3 = createMockOperation('pending', '0xghi');

      const scope = fork({
        values: new Map()
          .set(multisigOperation.__test.$cachedOperations, [op1, op2, op3])
          .set(operationsContextModel.$hiddenOperationIds, [op1.id, op2.id])
          .set(accounts.__test.$populated, true)
          .set(accounts.__test.$list, [mockMultisigAccount]),
      });

      const count = scope.getState(operationsContextModel.$hiddenOperationsCount);
      expect(count).toBe(2);
    });

    it('should auto-switch to pending tab when all operations are unhidden', async () => {
      const mockOperation = createMockOperation('pending');

      const scope = fork({
        values: new Map()
          .set(multisigOperation.__test.$cachedOperations, [mockOperation])
          .set(operationsContextModel.$hiddenOperationIds, [mockOperation.id])
          .set(operationsContextModel.$tab, 'hidden'),
      });

      await allSettled(operationsContextModel.unhideOperation, {
        scope,
        params: mockOperation.id,
      });

      expect(scope.getState(operationsContextModel.$tab)).toBe('pending');
    });

    it('should calculate pending count excluding hidden operations', async () => {
      const pendingOp1 = createMockOperation('pending', '0xabc');
      const pendingOp2 = createMockOperation('pending', '0xdef');
      const executedOp = createMockOperation('executed', '0xghi');

      const scope = fork({
        values: new Map()
          .set(multisigOperation.__test.$cachedOperations, [pendingOp1, pendingOp2, executedOp])
          .set(operationsContextModel.$hiddenOperationIds, [pendingOp1.id])
          .set(accounts.__test.$populated, true)
          .set(accounts.__test.$list, [mockMultisigAccount]),
      });

      const pendingCount = scope.getState(operationsContextModel.$pendingOperationsCount);
      expect(pendingCount).toBe(1); // Only pendingOp2, since pendingOp1 is hidden
    });
  });
});
