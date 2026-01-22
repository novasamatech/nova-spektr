import { allSettled, fork } from 'effector';
import { describe, expect, it, vi } from 'vitest';

// Mock components that cause circular dependency issues
vi.mock('../components/Operation', () => ({
  operationTitleTransformer: { createTransformer: () => {} },
}));

import { createAccountId, polkadotChainId } from '@/shared/mocks';
import { multisigOperation } from '@/domains/network';

import { operationsContextModel } from './context';
import { deepLinkModel } from './deep-link';

describe('operations context model', () => {
  const mockAccountId = createAccountId(1);

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
          .set(multisigOperation.__test.$list, [mockOperation])
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
          .set(multisigOperation.__test.$list, [mockOperation])
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
          .set(multisigOperation.__test.$list, [mockOperation])
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
          .set(multisigOperation.__test.$list, [mockOperation])
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
        values: new Map().set(multisigOperation.__test.$list, []).set(operationsContextModel.$tab, 'pending'),
      });

      await allSettled(deepLinkModel.$focusedOperationId, {
        scope,
        params: null,
      });

      expect(scope.getState(operationsContextModel.$tab)).toBe('pending');
    });

    it('should default to history tab when operation is not found', async () => {
      const scope = fork({
        values: new Map().set(multisigOperation.__test.$list, []).set(operationsContextModel.$tab, 'pending'),
      });

      await allSettled(deepLinkModel.$focusedOperationId, {
        scope,
        params: 'non-existent-operation-id',
      });

      // When operation is not found, defaults to 'history' (since status !== 'pending')
      expect(scope.getState(operationsContextModel.$tab)).toBe('history');
    });
  });
});
