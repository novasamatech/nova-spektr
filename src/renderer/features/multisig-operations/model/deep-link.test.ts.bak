import { allSettled, fork } from 'effector';
import { describe, expect, it, vi } from 'vitest';

vi.mock('./constants', () => ({
  CONNECTION_TIMEOUT: 1,
}));

import { AccountType, ConnectionStatus, CryptoType, SigningType } from '@/shared/core';
import { createAccountId, polkadotChain, polkadotChainId } from '@/shared/mocks';
import { accounts, initialOnChainFetch, multisigOperation } from '@/domains/network';
import { networkModel } from '@/entities/network';

import { type MultisigOperationDeepLinkData, deepLinkModel } from './deep-link';

describe('multisig operations deep link', () => {
  const mockAccountId = createAccountId(1);

  const mockAccount = {
    id: 1,
    accountId: mockAccountId,
    walletId: 1,
    name: 'Test Account',
    accountType: AccountType.MULTISIG,
    type: 'universal' as const,
    cryptoType: CryptoType.SR25519,
    signingType: SigningType.WATCH_ONLY,
    signatories: [],
    threshold: 2,
  };

  const createMockOperation = (status: 'pending' | 'executed', callHash = '0xabc123') => {
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

  const deepLinkData: MultisigOperationDeepLinkData = {
    chainId: polkadotChainId,
    callHash: '0xabc123',
    accountId: mockAccountId,
    blockCreated: 100,
    indexCreated: 1,
  };

  describe('Network validation', () => {
    it('should open network not available modal when chain does not exist', async () => {
      const scope = fork({
        values: new Map()
          .set(networkModel.$chains, {})
          .set(accounts.__test.$list, [])
          .set(accounts.__test.$populated, true),
      });

      const invalidChainData: MultisigOperationDeepLinkData = {
        chainId: '0x123' as any,
        callHash: '0xabc',
        accountId: mockAccountId,
        blockCreated: 100,
        indexCreated: 1,
      };

      await allSettled(deepLinkModel.multisigOperationDeepLinkHandler.triggered as any, {
        scope,
        params: invalidChainData,
      });

      expect(scope.getState(deepLinkModel.$isNetworkNotAvailableModalOpen)).toBe(true);
    });

    it('should close network not available modal', async () => {
      const scope = fork({
        values: new Map()
          .set(networkModel.$chains, {})
          .set(accounts.__test.$list, [])
          .set(accounts.__test.$populated, true),
      });

      const invalidChainData: MultisigOperationDeepLinkData = {
        chainId: '0x123' as any,
        callHash: '0xabc',
        accountId: mockAccountId,
        blockCreated: 100,
        indexCreated: 1,
      };

      await allSettled(deepLinkModel.multisigOperationDeepLinkHandler.triggered as any, {
        scope,
        params: invalidChainData,
      });

      expect(scope.getState(deepLinkModel.$isNetworkNotAvailableModalOpen)).toBe(true);

      await allSettled(deepLinkModel.closeNetworkNotAvailableModal, { scope });

      expect(scope.getState(deepLinkModel.$isNetworkNotAvailableModalOpen)).toBe(false);
    });
  });

  describe('Account validation', () => {
    it('should open account not found modal when account does not exist', async () => {
      const scope = fork({
        values: new Map()
          .set(networkModel.$chains, { [polkadotChainId]: polkadotChain })
          .set(networkModel.$connectionStatuses, { [polkadotChainId]: ConnectionStatus.CONNECTED })
          .set(accounts.__test.$list, [])
          .set(accounts.__test.$populated, true)
          .set(multisigOperation.__test.$populated, true)
          .set(multisigOperation.__test.$onChainReady, true)
          .set(multisigOperation.__test.$offChainReady, true),
      });

      await allSettled(deepLinkModel.multisigOperationDeepLinkHandler.triggered as any, {
        scope,
        params: deepLinkData,
      });

      expect(scope.getState(deepLinkModel.$isAccountNotFoundModalOpen)).toBe(true);
    });

    it('should not open account not found modal when account exists', async () => {
      const scope = fork({
        values: new Map()
          .set(networkModel.$chains, { [polkadotChainId]: polkadotChain })
          .set(networkModel.$connectionStatuses, { [polkadotChainId]: ConnectionStatus.CONNECTED })
          .set(accounts.__test.$list, [mockAccount])
          .set(accounts.__test.$populated, true)
          .set(multisigOperation.__test.$list, [])
          .set(multisigOperation.__test.$onChainReady, true)
          .set(multisigOperation.__test.$offChainReady, true)
          .set(multisigOperation.__test.$populated, true),
      });

      await allSettled(deepLinkModel.multisigOperationDeepLinkHandler.triggered as any, {
        scope,
        params: deepLinkData,
      });

      expect(scope.getState(deepLinkModel.$isAccountNotFoundModalOpen)).toBe(false);
    });

    it('should wait for accounts to be populated before checking (cold start)', async () => {
      const scope = fork({
        values: new Map()
          .set(networkModel.$chains, { [polkadotChainId]: polkadotChain })
          .set(networkModel.$connectionStatuses, { [polkadotChainId]: ConnectionStatus.CONNECTED })
          .set(accounts.__test.$list, [mockAccount])
          .set(accounts.__test.$populated, false)
          .set(multisigOperation.__test.$populated, false)
          .set(multisigOperation.__test.$onChainReady, false)
          .set(multisigOperation.__test.$offChainReady, false),
      });

      await allSettled(deepLinkModel.multisigOperationDeepLinkHandler.triggered as any, {
        scope,
        params: deepLinkData,
      });

      // Should not open modal immediately when accounts aren't populated
      expect(scope.getState(deepLinkModel.$isAccountNotFoundModalOpen)).toBe(false);

      // Simulate accounts being populated
      await allSettled(accounts.populate, { scope });

      // Still should not open modal because account exists
      expect(scope.getState(deepLinkModel.$isAccountNotFoundModalOpen)).toBe(false);
    });

    it('should close account not found modal', async () => {
      const scope = fork({
        values: new Map()
          .set(networkModel.$chains, { [polkadotChainId]: polkadotChain })
          .set(networkModel.$connectionStatuses, { [polkadotChainId]: ConnectionStatus.CONNECTED })
          .set(accounts.__test.$list, [])
          .set(accounts.__test.$populated, true)
          .set(multisigOperation.__test.$populated, true)
          .set(multisigOperation.__test.$onChainReady, true)
          .set(multisigOperation.__test.$offChainReady, true),
      });

      await allSettled(deepLinkModel.multisigOperationDeepLinkHandler.triggered as any, {
        scope,
        params: deepLinkData,
      });

      expect(scope.getState(deepLinkModel.$isAccountNotFoundModalOpen)).toBe(true);

      await allSettled(deepLinkModel.closeNotFoundModal, { scope });

      expect(scope.getState(deepLinkModel.$isAccountNotFoundModalOpen)).toBe(false);
    });
  });

  describe('Operation lookup', () => {
    it('should set focused operation ID when operation exists and is pending', async () => {
      const mockOperation = createMockOperation('pending');
      const expectedOperationId = mockOperation.id;

      const scope = fork({
        values: new Map()
          .set(networkModel.$chains, { [polkadotChainId]: polkadotChain })
          .set(networkModel.$connectionStatuses, { [polkadotChainId]: ConnectionStatus.CONNECTED })
          .set(accounts.__test.$list, [mockAccount])
          .set(accounts.__test.$populated, true)
          .set(multisigOperation.__test.$list, [mockOperation])
          .set(multisigOperation.__test.$populated, true)
          .set(multisigOperation.__test.$onChainReady, true)
          .set(multisigOperation.__test.$offChainReady, true),
      });

      await allSettled(deepLinkModel.multisigOperationDeepLinkHandler.triggered as any, {
        scope,
        params: deepLinkData,
      });

      expect(scope.getState(deepLinkModel.$focusedOperationId)).toBe(expectedOperationId);
    });

    it('should open already signed modal when operation status is executed', async () => {
      const mockOperation = createMockOperation('executed');

      const scope = fork({
        values: new Map()
          .set(networkModel.$chains, { [polkadotChainId]: polkadotChain })
          .set(networkModel.$connectionStatuses, { [polkadotChainId]: ConnectionStatus.CONNECTED })
          .set(accounts.__test.$list, [mockAccount])
          .set(accounts.__test.$populated, true)
          .set(multisigOperation.__test.$list, [mockOperation])
          .set(multisigOperation.__test.$populated, true)
          .set(multisigOperation.__test.$onChainReady, true)
          .set(multisigOperation.__test.$offChainReady, true),
      });

      await allSettled(deepLinkModel.multisigOperationDeepLinkHandler.triggered as any, {
        scope,
        params: deepLinkData,
      });

      expect(scope.getState(deepLinkModel.$isAlreadySignedModalOpen)).toBe(true);
      expect(scope.getState(deepLinkModel.$focusedOperationId)).toBeNull();
    });

    it('should allow viewing already signed operation', async () => {
      const mockOperation = createMockOperation('executed');

      const scope = fork({
        values: new Map()
          .set(networkModel.$chains, { [polkadotChainId]: polkadotChain })
          .set(networkModel.$connectionStatuses, { [polkadotChainId]: ConnectionStatus.CONNECTED })
          .set(accounts.__test.$list, [mockAccount])
          .set(accounts.__test.$populated, true)
          .set(multisigOperation.__test.$list, [mockOperation])
          .set(multisigOperation.__test.$populated, true)
          .set(multisigOperation.__test.$onChainReady, true)
          .set(multisigOperation.__test.$offChainReady, true),
      });

      await allSettled(deepLinkModel.multisigOperationDeepLinkHandler.triggered as any, {
        scope,
        params: deepLinkData,
      });

      expect(scope.getState(deepLinkModel.$isAlreadySignedModalOpen)).toBe(true);
      expect(scope.getState(deepLinkModel.$focusedOperationId)).toBeNull();

      // User clicks "View" button
      await allSettled(deepLinkModel.viewAlreadySignedOperation, { scope });

      expect(scope.getState(deepLinkModel.$isAlreadySignedModalOpen)).toBe(false);
      expect(scope.getState(deepLinkModel.$focusedOperationId)).toBe(mockOperation.id);
    });

    it('should wait for operations to load before showing operation not found', async () => {
      const scope = fork({
        values: new Map()
          .set(networkModel.$chains, { [polkadotChainId]: polkadotChain })
          .set(networkModel.$connectionStatuses, { [polkadotChainId]: ConnectionStatus.CONNECTED })
          .set(accounts.__test.$list, [mockAccount])
          .set(accounts.__test.$populated, true)
          .set(multisigOperation.__test.$list, [])
          .set(multisigOperation.__test.$populated, true)
          .set(multisigOperation.__test.$onChainReady, false)
          .set(multisigOperation.__test.$offChainReady, false),
      });

      await allSettled(deepLinkModel.multisigOperationDeepLinkHandler.triggered as any, {
        scope,
        params: deepLinkData,
      });

      // Should not show operation not found modal while still loading
      expect(scope.getState(deepLinkModel.$isOperationNotFoundModalOpen)).toBe(false);
      expect(scope.getState(deepLinkModel.$isDeepLinkLoading)).toBe(true);
    });

    it('should show operation not found modal after loading completes without operation', async () => {
      const scope = fork({
        handlers: [[initialOnChainFetch.fetch, () => ({ onChainData: {}, callHashesByChain: {} })]],
        values: new Map()
          .set(networkModel.$chains, { [polkadotChainId]: polkadotChain })
          .set(networkModel.$connectionStatuses, { [polkadotChainId]: ConnectionStatus.CONNECTED })
          .set(accounts.__test.$list, [mockAccount])
          .set(accounts.__test.$populated, true)
          .set(multisigOperation.__test.$list, [])
          .set(multisigOperation.__test.$populated, true)
          .set(multisigOperation.__test.$onChainReady, false)
          .set(multisigOperation.__test.$offChainReady, true),
      });

      await allSettled(deepLinkModel.multisigOperationDeepLinkHandler.triggered as any, {
        scope,
        params: deepLinkData,
      });

      expect(scope.getState(deepLinkModel.$isOperationNotFoundModalOpen)).toBe(false);

      // Simulate initial loading completing without the operation
      await allSettled(initialOnChainFetch.fetch, {
        scope,
        params: { apis: {}, chains: {}, accountIds: [] },
      });

      expect(scope.getState(deepLinkModel.$isOperationNotFoundModalOpen)).toBe(true);
    });

    it('should focus operation if it appears during waiting period', async () => {
      const mockOperation = createMockOperation('pending');

      const scope = fork({
        handlers: [[initialOnChainFetch.fetch, () => ({ onChainData: {}, callHashesByChain: {} })]],
        values: new Map()
          .set(networkModel.$chains, { [polkadotChainId]: polkadotChain })
          .set(networkModel.$connectionStatuses, { [polkadotChainId]: ConnectionStatus.CONNECTED })
          .set(accounts.__test.$list, [mockAccount])
          .set(accounts.__test.$populated, true)
          .set(multisigOperation.__test.$list, [])
          .set(multisigOperation.__test.$populated, true)
          .set(multisigOperation.__test.$onChainReady, false)
          .set(multisigOperation.__test.$offChainReady, true),
      });

      await allSettled(deepLinkModel.multisigOperationDeepLinkHandler.triggered as any, {
        scope,
        params: deepLinkData,
      });

      expect(scope.getState(deepLinkModel.$focusedOperationId)).toBe(mockOperation.id);

      // Simulate operation appearing
      await allSettled(multisigOperation.__test.$list, { scope, params: [mockOperation] });

      // Simulate loading completing
      await allSettled(initialOnChainFetch.fetch, {
        scope,
        params: { apis: {}, chains: {}, accountIds: [] },
      });

      expect(scope.getState(deepLinkModel.$focusedOperationId)).toBe(mockOperation.id);
    });
  });

  describe('Connection handling', () => {
    it('should open connection timeout modal when connection takes too long', async () => {
      const scope = fork({
        values: new Map()
          .set(networkModel.$chains, { [polkadotChainId]: polkadotChain })
          .set(networkModel.$connectionStatuses, { [polkadotChainId]: ConnectionStatus.CONNECTING })
          .set(accounts.__test.$list, [mockAccount])
          .set(accounts.__test.$populated, true)
          .set(multisigOperation.__test.$list, [])
          .set(multisigOperation.__test.$populated, true)
          .set(multisigOperation.__test.$onChainReady, true)
          .set(multisigOperation.__test.$offChainReady, true),
      });

      await allSettled(deepLinkModel.multisigOperationDeepLinkHandler.triggered as any, {
        scope,
        params: deepLinkData,
      });

      // Wait for timeout (mocked to 1ms)
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(scope.getState(deepLinkModel.$isConnectionTimeoutModalOpen)).toBe(true);
    });

    it('should open connection timeout modal on connection error', async () => {
      const scope = fork({
        values: new Map()
          .set(networkModel.$chains, { [polkadotChainId]: polkadotChain })
          .set(networkModel.$connectionStatuses, { [polkadotChainId]: ConnectionStatus.CONNECTING })
          .set(accounts.__test.$list, [mockAccount])
          .set(accounts.__test.$populated, true)
          .set(multisigOperation.__test.$list, [])
          .set(multisigOperation.__test.$populated, true)
          .set(multisigOperation.__test.$onChainReady, true)
          .set(multisigOperation.__test.$offChainReady, true),
      });

      await allSettled(deepLinkModel.multisigOperationDeepLinkHandler.triggered as any, {
        scope,
        params: deepLinkData,
      });

      // Simulate connection error
      await allSettled(networkModel.output.connectionStatusChanged, {
        scope,
        params: { chainId: polkadotChainId, status: ConnectionStatus.ERROR },
      });

      expect(scope.getState(deepLinkModel.$isConnectionTimeoutModalOpen)).toBe(true);
    });

    it('should retry deep link checks when retry is clicked', async () => {
      const mockOperation = createMockOperation('pending');

      const scope = fork({
        values: new Map()
          .set(networkModel.$chains, { [polkadotChainId]: polkadotChain })
          .set(networkModel.$connectionStatuses, { [polkadotChainId]: ConnectionStatus.CONNECTED })
          .set(accounts.__test.$list, [mockAccount])
          .set(accounts.__test.$populated, true)
          .set(multisigOperation.__test.$list, [mockOperation])
          .set(multisigOperation.__test.$populated, true)
          .set(multisigOperation.__test.$onChainReady, true)
          .set(multisigOperation.__test.$offChainReady, true),
      });

      // Store initial deep link data
      await allSettled(deepLinkModel.multisigOperationDeepLinkHandler.triggered as any, {
        scope,
        params: deepLinkData,
      });

      // Verify operation was focused
      expect(scope.getState(deepLinkModel.$focusedOperationId)).toBe(mockOperation.id);

      // Clear focused operation to test retry restarts the process
      await allSettled(deepLinkModel.setFocusedOperationId, { scope, params: null });
      expect(scope.getState(deepLinkModel.$focusedOperationId)).toBeNull();

      // Retry should re-trigger the deep link handler with the same data
      await allSettled(deepLinkModel.retryConnectionTimeout, { scope });

      // Should re-focus the operation
      expect(scope.getState(deepLinkModel.$focusedOperationId)).toBe(mockOperation.id);
    });

    it('should close connection timeout modal', async () => {
      const scope = fork({
        values: new Map()
          .set(networkModel.$chains, { [polkadotChainId]: polkadotChain })
          .set(networkModel.$connectionStatuses, { [polkadotChainId]: ConnectionStatus.CONNECTING })
          .set(accounts.__test.$list, [mockAccount])
          .set(accounts.__test.$populated, true)
          .set(multisigOperation.__test.$list, [])
          .set(multisigOperation.__test.$populated, true)
          .set(multisigOperation.__test.$onChainReady, true)
          .set(multisigOperation.__test.$offChainReady, true),
      });

      await allSettled(deepLinkModel.multisigOperationDeepLinkHandler.triggered as any, {
        scope,
        params: deepLinkData,
      });

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(scope.getState(deepLinkModel.$isConnectionTimeoutModalOpen)).toBe(true);

      await allSettled(deepLinkModel.closeConnectionTimeoutModal, { scope });

      expect(scope.getState(deepLinkModel.$isConnectionTimeoutModalOpen)).toBe(false);
    });
  });

  describe('Modal state management', () => {
    it('should reset all modal states when operations page is closed', async () => {
      const scope = fork({
        values: new Map()
          .set(networkModel.$chains, {})
          .set(accounts.__test.$list, [])
          .set(accounts.__test.$populated, true),
      });

      const invalidChainData: MultisigOperationDeepLinkData = {
        chainId: '0x123' as any,
        callHash: '0xabc',
        accountId: mockAccountId,
        blockCreated: 100,
        indexCreated: 1,
      };

      await allSettled(deepLinkModel.multisigOperationDeepLinkHandler.triggered as any, {
        scope,
        params: invalidChainData,
      });

      expect(scope.getState(deepLinkModel.$isNetworkNotAvailableModalOpen)).toBe(true);

      await allSettled(deepLinkModel.operationsPageClosed, { scope });

      expect(scope.getState(deepLinkModel.$isNetworkNotAvailableModalOpen)).toBe(false);
      expect(scope.getState(deepLinkModel.$focusedOperationId)).toBeNull();
    });

    it('should reopen already signed modal after page close and new deep link trigger', async () => {
      const mockOperation = createMockOperation('executed');

      const scope = fork({
        values: new Map()
          .set(networkModel.$chains, { [polkadotChainId]: polkadotChain })
          .set(networkModel.$connectionStatuses, { [polkadotChainId]: ConnectionStatus.CONNECTED })
          .set(accounts.__test.$list, [mockAccount])
          .set(accounts.__test.$populated, true)
          .set(multisigOperation.__test.$list, [mockOperation])
          .set(multisigOperation.__test.$populated, true)
          .set(multisigOperation.__test.$onChainReady, true)
          .set(multisigOperation.__test.$offChainReady, true),
      });

      await allSettled(deepLinkModel.multisigOperationDeepLinkHandler.triggered as any, {
        scope,
        params: deepLinkData,
      });

      expect(scope.getState(deepLinkModel.$isAlreadySignedModalOpen)).toBe(true);

      await allSettled(deepLinkModel.closeAlreadySignedModal, { scope });
      expect(scope.getState(deepLinkModel.$isAlreadySignedModalOpen)).toBe(false);

      await allSettled(deepLinkModel.operationsPageClosed, { scope });

      // Trigger deep link again - should reopen modal
      await allSettled(deepLinkModel.multisigOperationDeepLinkHandler.triggered as any, {
        scope,
        params: deepLinkData,
      });

      expect(scope.getState(deepLinkModel.$isAlreadySignedModalOpen)).toBe(true);
    });

    it('should reset focused operation ID on new deep link trigger', async () => {
      const mockOperation = createMockOperation('pending');

      const scope = fork({
        values: new Map()
          .set(networkModel.$chains, { [polkadotChainId]: polkadotChain })
          .set(networkModel.$connectionStatuses, { [polkadotChainId]: ConnectionStatus.CONNECTED })
          .set(accounts.__test.$list, [mockAccount])
          .set(accounts.__test.$populated, true)
          .set(multisigOperation.__test.$list, [mockOperation])
          .set(multisigOperation.__test.$populated, true)
          .set(multisigOperation.__test.$onChainReady, true)
          .set(multisigOperation.__test.$offChainReady, true),
      });

      await allSettled(deepLinkModel.multisigOperationDeepLinkHandler.triggered as any, {
        scope,
        params: deepLinkData,
      });

      expect(scope.getState(deepLinkModel.$focusedOperationId)).toBe(mockOperation.id);

      // Trigger new deep link
      const newDeepLinkData: MultisigOperationDeepLinkData = {
        chainId: polkadotChainId,
        callHash: '0xdifferent',
        accountId: mockAccountId,
        blockCreated: 200,
        indexCreated: 2,
      };

      await allSettled(deepLinkModel.multisigOperationDeepLinkHandler.triggered as any, {
        scope,
        params: newDeepLinkData,
      });

      // Should focus the new operation ID even if it doesn't exist yet
      expect(scope.getState(deepLinkModel.$focusedOperationId)).not.toBeNull();
      expect(scope.getState(deepLinkModel.$focusedOperationId)).not.toBe(mockOperation.id);
    });
  });
});
