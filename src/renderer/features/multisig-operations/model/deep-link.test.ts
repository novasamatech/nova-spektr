import { allSettled, fork } from 'effector';
import { describe, expect, it, vi } from 'vitest';

vi.mock('./constants', () => ({
  CONNECTION_TIMEOUT: 1,
}));

import { AccountType, ConnectionStatus, CryptoType, SigningType } from '@/shared/core';
import { createAccountId, polkadotChain, polkadotChainId } from '@/shared/mocks';
import { accounts, multisigOperation } from '@/domains/network';
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

  it('should open network not available modal when chain does not exist', async () => {
    const scope = fork({
      values: new Map().set(networkModel.$chains, {}).set(accounts.__test.$list, []),
    });

    const deepLinkData: MultisigOperationDeepLinkData = {
      chainId: '0x123' as any,
      callHash: '0xabc',
      accountId: mockAccountId,
      blockCreated: 100,
      indexCreated: 1,
    };

    await allSettled(deepLinkModel.multisigOperationDeepLinkHandler.triggered as any, {
      scope,
      params: deepLinkData,
    });

    expect(scope.getState(deepLinkModel.$isNetworkNotAvailableModalOpen)).toBe(true);
  });

  it('should open account not found modal when account does not exist', async () => {
    const scope = fork({
      values: new Map()
        .set(networkModel.$chains, { [polkadotChainId]: polkadotChain })
        .set(accounts.__test.$list, [])
        .set(accounts.__test.$populated, true)
        .set(multisigOperation.__test.$populated, true),
    });

    const deepLinkData: MultisigOperationDeepLinkData = {
      chainId: polkadotChainId,
      callHash: '0xabc',
      accountId: mockAccountId,
      blockCreated: 100,
      indexCreated: 1,
    };

    await allSettled(deepLinkModel.multisigOperationDeepLinkHandler.triggered as any, {
      scope,
      params: deepLinkData,
    });

    expect(scope.getState(deepLinkModel.$isAccountNotFoundModalOpen)).toBe(true);
  });

  it('should wait for accounts to be populated before checking (cold start)', async () => {
    const scope = fork({
      values: new Map()
        .set(networkModel.$chains, { [polkadotChainId]: polkadotChain })
        .set(accounts.__test.$list, [mockAccount])
        .set(accounts.__test.$populated, false),
    });

    const deepLinkData: MultisigOperationDeepLinkData = {
      chainId: polkadotChainId,
      callHash: '0xabc',
      accountId: mockAccountId,
      blockCreated: 100,
      indexCreated: 1,
    };

    await allSettled(deepLinkModel.multisigOperationDeepLinkHandler.triggered as any, {
      scope,
      params: deepLinkData,
    });

    expect(scope.getState(deepLinkModel.$isAccountNotFoundModalOpen)).toBe(false);

    await allSettled(accounts.populate, { scope });

    expect(scope.getState(deepLinkModel.$isAccountNotFoundModalOpen)).toBe(false);
  });

  it('should close network not available modal', async () => {
    const scope = fork({
      values: new Map().set(networkModel.$chains, {}).set(accounts.__test.$list, []),
    });

    const deepLinkData: MultisigOperationDeepLinkData = {
      chainId: '0x123' as any,
      callHash: '0xabc',
      accountId: mockAccountId,
      blockCreated: 100,
      indexCreated: 1,
    };

    await allSettled(deepLinkModel.multisigOperationDeepLinkHandler.triggered as any, {
      scope,
      params: deepLinkData,
    });

    expect(scope.getState(deepLinkModel.$isNetworkNotAvailableModalOpen)).toBe(true);

    await allSettled(deepLinkModel.closeNetworkNotAvailableModal, { scope });

    expect(scope.getState(deepLinkModel.$isNetworkNotAvailableModalOpen)).toBe(false);
  });

  it('should reset modal state when operations page is closed', async () => {
    const scope = fork({
      values: new Map().set(networkModel.$chains, {}).set(accounts.__test.$list, []),
    });

    const deepLinkData: MultisigOperationDeepLinkData = {
      chainId: '0x123' as any,
      callHash: '0xabc',
      accountId: mockAccountId,
      blockCreated: 100,
      indexCreated: 1,
    };

    await allSettled(deepLinkModel.multisigOperationDeepLinkHandler.triggered as any, {
      scope,
      params: deepLinkData,
    });

    expect(scope.getState(deepLinkModel.$isNetworkNotAvailableModalOpen)).toBe(true);

    await allSettled(deepLinkModel.operationsPageClosed, { scope });

    expect(scope.getState(deepLinkModel.$isNetworkNotAvailableModalOpen)).toBe(false);
  });

  it('should not open account not found modal when account exists', async () => {
    const scope = fork({
      values: new Map()
        .set(networkModel.$chains, { [polkadotChainId]: polkadotChain })
        .set(networkModel.$connectionStatuses, { [polkadotChainId]: ConnectionStatus.CONNECTED })
        .set(accounts.__test.$list, [mockAccount])
        .set(multisigOperation.__test.$list, [])
        .set(multisigOperation.__test.$populated, true),
      handlers: [[multisigOperation.requestOperations, () => []]],
    });

    const deepLinkData: MultisigOperationDeepLinkData = {
      chainId: polkadotChainId,
      callHash: '0xabc',
      accountId: mockAccountId,
      blockCreated: 100,
      indexCreated: 1,
    };

    await allSettled(deepLinkModel.multisigOperationDeepLinkHandler.triggered as any, {
      scope,
      params: deepLinkData,
    });

    expect(scope.getState(deepLinkModel.$isAccountNotFoundModalOpen)).toBe(false);
  });

  it('should set focused operation ID when everything is valid', async () => {
    const mockOperation = createMockOperation('pending');
    const expectedOperationId = mockOperation.id;

    const scope = fork({
      values: new Map()
        .set(networkModel.$chains, { [polkadotChainId]: polkadotChain })
        .set(accounts.__test.$list, [mockAccount])
        .set(multisigOperation.__test.$list, [mockOperation])
        .set(multisigOperation.__test.$populated, true),
    });

    const deepLinkData: MultisigOperationDeepLinkData = {
      chainId: polkadotChainId,
      callHash: '0xabc123',
      accountId: mockAccountId,
      blockCreated: 100,
      indexCreated: 1,
    };

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
        .set(accounts.__test.$list, [mockAccount])
        .set(multisigOperation.__test.$list, [mockOperation])
        .set(multisigOperation.__test.$populated, true),
    });

    const deepLinkData: MultisigOperationDeepLinkData = {
      chainId: polkadotChainId,
      callHash: '0xabc123',
      accountId: mockAccountId,
      blockCreated: 100,
      indexCreated: 1,
    };

    await allSettled(deepLinkModel.multisigOperationDeepLinkHandler.triggered as any, {
      scope,
      params: deepLinkData,
    });

    expect(scope.getState(deepLinkModel.$isAlreadySignedModalOpen)).toBe(true);
    expect(scope.getState(deepLinkModel.$focusedOperationId)).toBeNull();
  });

  it('should not reopen already signed modal after closing and returning to page', async () => {
    const mockOperation = createMockOperation('executed');

    const scope = fork({
      values: new Map()
        .set(networkModel.$chains, { [polkadotChainId]: polkadotChain })
        .set(accounts.__test.$list, [mockAccount])
        .set(multisigOperation.__test.$list, [mockOperation])
        .set(multisigOperation.__test.$populated, true),
    });

    const deepLinkData: MultisigOperationDeepLinkData = {
      chainId: polkadotChainId,
      callHash: '0xabc123',
      accountId: mockAccountId,
      blockCreated: 100,
      indexCreated: 1,
    };

    await allSettled(deepLinkModel.multisigOperationDeepLinkHandler.triggered as any, {
      scope,
      params: deepLinkData,
    });

    expect(scope.getState(deepLinkModel.$isAlreadySignedModalOpen)).toBe(true);

    await allSettled(deepLinkModel.closeAlreadySignedModal, { scope });
    expect(scope.getState(deepLinkModel.$isAlreadySignedModalOpen)).toBe(false);

    await allSettled(deepLinkModel.operationsPageClosed, { scope });

    // Trigger deep link again
    await allSettled(deepLinkModel.multisigOperationDeepLinkHandler.triggered as any, {
      scope,
      params: deepLinkData,
    });

    expect(scope.getState(deepLinkModel.$isAlreadySignedModalOpen)).toBe(true);
  });
});
