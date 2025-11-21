import { allSettled, fork } from 'effector';
import { describe, expect, it } from 'vitest';

import { AccountType, CryptoType, SigningType } from '@/shared/core';
import { accounts, multisigOperation } from '@/domains/network';
import { networkModel } from '@/entities/network';

import { type MultisigOperationDeepLinkData, deepLinkModel } from './deep-link';

describe('multisig operations deep link', () => {
  it('should open network not available modal when chain does not exist', async () => {
    const scope = fork({
      values: new Map().set(networkModel.$chains, {}).set(accounts.__test.$list, []),
    });

    const deepLinkData: MultisigOperationDeepLinkData = {
      chainId: '0x123' as any,
      callHash: '0xabc',
      accountId: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY' as any,
      blockCreated: 100,
      indexCreated: 1,
    };

    expect(scope.getState(deepLinkModel.$isNetworkNotAvailableModalOpen)).toBe(false);

    await allSettled(deepLinkModel.multisigOperationDeepLinkHandler.triggered as any, {
      scope,
      params: deepLinkData,
    });

    expect(scope.getState(deepLinkModel.$isNetworkNotAvailableModalOpen)).toBe(true);
  });

  it('should open account not found modal when account does not exist', async () => {
    const mockChain = {
      chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3' as any,
      name: 'Polkadot',
      assets: [],
      nodes: [],
      addressPrefix: 0,
      explorers: [],
      externalApi: {},
      icon: 'polkadot',
      options: ['MULTISIG'],
    };

    const scope = fork({
      values: new Map()
        .set(networkModel.$chains, {
          [mockChain.chainId]: mockChain,
        })
        .set(accounts.__test.$list, [])
        .set(accounts.__test.$populated, true)
        .set(multisigOperation.__test.$populated, true),
    });

    const deepLinkData: MultisigOperationDeepLinkData = {
      chainId: mockChain.chainId,
      callHash: '0xabc',
      accountId: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY' as any,
      blockCreated: 100,
      indexCreated: 1,
    };

    expect(scope.getState(deepLinkModel.$isAccountNotFoundModalOpen)).toBe(false);

    await allSettled(deepLinkModel.multisigOperationDeepLinkHandler.triggered as any, {
      scope,
      params: deepLinkData,
    });

    expect(scope.getState(deepLinkModel.$isAccountNotFoundModalOpen)).toBe(true);
  });

  it('should wait for accounts to be populated before checking (cold start)', async () => {
    const mockChain = {
      chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3' as any,
      name: 'Polkadot',
      assets: [],
      nodes: [],
      addressPrefix: 0,
      explorers: [],
      externalApi: {},
      icon: 'polkadot',
      options: ['MULTISIG'],
    };

    const mockAccountId = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
    const mockAccount = {
      id: 1,
      accountId: mockAccountId as any,
      walletId: 1,
      name: 'Test Account',
      accountType: AccountType.MULTISIG,
      type: 'universal' as const,
      cryptoType: CryptoType.SR25519,
      signingType: SigningType.WATCH_ONLY,
      signatories: [],
      threshold: 2,
    };

    // Simulate cold start: accounts not yet populated
    const scope = fork({
      values: new Map()
        .set(networkModel.$chains, {
          [mockChain.chainId]: mockChain,
        })
        .set(accounts.__test.$list, [mockAccount])
        .set(accounts.__test.$populated, false),
    });

    const deepLinkData: MultisigOperationDeepLinkData = {
      chainId: mockChain.chainId,
      callHash: '0xabc',
      accountId: mockAccountId as any,
      blockCreated: 100,
      indexCreated: 1,
    };

    // Trigger deep link before accounts are populated
    await allSettled(deepLinkModel.multisigOperationDeepLinkHandler.triggered as any, {
      scope,
      params: deepLinkData,
    });

    // Should NOT open account not found modal yet (waiting for accounts to populate)
    expect(scope.getState(deepLinkModel.$isAccountNotFoundModalOpen)).toBe(false);

    // Simulate accounts being populated from DB
    await allSettled(accounts.populate, { scope });

    // Now account should be found and no error modal should open
    expect(scope.getState(deepLinkModel.$isAccountNotFoundModalOpen)).toBe(false);
  });

  it('should not open account not found modal when account exists', async () => {
    const mockChain = {
      chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3' as any,
      name: 'Polkadot',
      assets: [],
      nodes: [],
      addressPrefix: 0,
      explorers: [],
      externalApi: {},
      icon: 'polkadot',
      options: ['MULTISIG'],
    };

    const mockAccountId = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
    const mockAccount = {
      id: 1,
      accountId: mockAccountId as any,
      walletId: 1,
      name: 'Test Account',
      accountType: AccountType.MULTISIG,
      type: 'universal' as const,
      cryptoType: CryptoType.SR25519,
      signingType: SigningType.WATCH_ONLY,
      signatories: [],
      threshold: 2,
    };

    const scope = fork({
      values: new Map()
        .set(networkModel.$chains, {
          [mockChain.chainId]: mockChain,
        })
        .set(accounts.__test.$list, [mockAccount])
        .set(accounts.__test.$populated, true),
    });

    const deepLinkData: MultisigOperationDeepLinkData = {
      chainId: mockChain.chainId,
      callHash: '0xabc',
      accountId: mockAccountId as any,
      blockCreated: 100,
      indexCreated: 1,
    };

    expect(scope.getState(deepLinkModel.$isAccountNotFoundModalOpen)).toBe(false);

    await allSettled(deepLinkModel.multisigOperationDeepLinkHandler.triggered as any, {
      scope,
      params: deepLinkData,
    });

    expect(scope.getState(deepLinkModel.$isAccountNotFoundModalOpen)).toBe(false);
  });

  it('should set focused operation ID when everything is valid', async () => {
    const mockChain = {
      chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3' as any,
      name: 'Polkadot',
      assets: [],
      nodes: [],
      addressPrefix: 0,
      explorers: [],
      externalApi: {},
      icon: 'polkadot',
      options: ['MULTISIG'],
    };

    const mockAccountId = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
    const mockAccount = {
      id: 1,
      accountId: mockAccountId as any,
      walletId: 1,
      name: 'Test Account',
      accountType: AccountType.MULTISIG,
      type: 'universal' as const,
      cryptoType: CryptoType.SR25519,
      signingType: SigningType.WATCH_ONLY,
      signatories: [],
      threshold: 2,
    };

    const deepLinkData: MultisigOperationDeepLinkData = {
      chainId: mockChain.chainId,
      callHash: '0xabc123',
      accountId: mockAccountId as any,
      blockCreated: 100,
      indexCreated: 1,
    };

    const expectedOperationId = `${mockChain.chainId}-0xabc123-${mockAccountId}-100-1`;

    const mockOperation = {
      id: expectedOperationId,
      status: 'pending' as const,
      transaction: null,
      method: null,
      section: null,
      callHash: '0xabc123' as any,
      callData: null,
      chainId: mockChain.chainId,
      accountId: mockAccountId as any,
      depositor: mockAccountId as any,
      blockCreated: 100 as any,
      indexCreated: 1,
      events: [],
      timestamp: Date.now(),
    };

    const scope = fork({
      values: new Map()
        .set(networkModel.$chains, {
          [mockChain.chainId]: mockChain,
        })
        .set(accounts.__test.$list, [mockAccount])
        .set(accounts.__test.$populated, true)
        .set(multisigOperation.__test.$list, [mockOperation])
        .set(multisigOperation.__test.$populated, true)
        .set(networkModel.$apis, {}),
    });

    expect(scope.getState(deepLinkModel.$focusedOperationId)).toBeNull();
    expect(scope.getState(deepLinkModel.$isNetworkNotAvailableModalOpen)).toBe(false);
    expect(scope.getState(deepLinkModel.$isAccountNotFoundModalOpen)).toBe(false);

    await allSettled(deepLinkModel.multisigOperationDeepLinkHandler.triggered as any, {
      scope,
      params: deepLinkData,
    });

    // Should set the focused operation ID
    expect(scope.getState(deepLinkModel.$focusedOperationId)).toBe(expectedOperationId);

    // Should not open any error modals
    expect(scope.getState(deepLinkModel.$isNetworkNotAvailableModalOpen)).toBe(false);
    expect(scope.getState(deepLinkModel.$isAccountNotFoundModalOpen)).toBe(false);
    expect(scope.getState(deepLinkModel.$isOperationNotFoundModalOpen)).toBe(false);
  });

  it('should open already signed modal when operation status is executed', async () => {
    const mockChain = {
      chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3' as any,
      name: 'Polkadot',
      assets: [],
      nodes: [],
      addressPrefix: 0,
      explorers: [],
      externalApi: {},
      icon: 'polkadot',
      options: ['MULTISIG'],
    };

    const mockAccountId = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
    const mockAccount = {
      id: 1,
      accountId: mockAccountId as any,
      walletId: 1,
      name: 'Test Account',
      accountType: AccountType.MULTISIG,
      type: 'universal' as const,
      cryptoType: CryptoType.SR25519,
      signingType: SigningType.WATCH_ONLY,
      signatories: [],
      threshold: 2,
    };

    const deepLinkData: MultisigOperationDeepLinkData = {
      chainId: mockChain.chainId,
      callHash: '0xabc123',
      accountId: mockAccountId as any,
      blockCreated: 100,
      indexCreated: 1,
    };

    const expectedOperationId = `${mockChain.chainId}-0xabc123-${mockAccountId}-100-1`;

    const mockOperation = {
      id: expectedOperationId,
      status: 'executed' as const,
      transaction: null,
      method: null,
      section: null,
      callHash: '0xabc123' as any,
      callData: null,
      chainId: mockChain.chainId,
      accountId: mockAccountId as any,
      depositor: mockAccountId as any,
      blockCreated: 100 as any,
      indexCreated: 1,
      events: [],
      timestamp: Date.now(),
    };

    const scope = fork({
      values: new Map()
        .set(networkModel.$chains, {
          [mockChain.chainId]: mockChain,
        })
        .set(accounts.__test.$list, [mockAccount])
        .set(accounts.__test.$populated, true)
        .set(multisigOperation.__test.$list, [mockOperation])
        .set(multisigOperation.__test.$populated, true)
        .set(networkModel.$apis, {}),
    });

    expect(scope.getState(deepLinkModel.$isAlreadySignedModalOpen)).toBe(false);

    await allSettled(deepLinkModel.multisigOperationDeepLinkHandler.triggered as any, {
      scope,
      params: deepLinkData,
    });

    // Should open the already signed modal
    expect(scope.getState(deepLinkModel.$isAlreadySignedModalOpen)).toBe(true);
    // Should not set focused operation ID (because operation is already executed)
    expect(scope.getState(deepLinkModel.$focusedOperationId)).toBeNull();
  });

  it('should not reopen already signed modal after closing and returning to page', async () => {
    const mockChain = {
      chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3' as any,
      name: 'Polkadot',
      assets: [],
      nodes: [],
      addressPrefix: 0,
      explorers: [],
      externalApi: {},
      icon: 'polkadot',
      options: ['MULTISIG'],
    };

    const mockAccountId = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
    const mockAccount = {
      id: 1,
      accountId: mockAccountId as any,
      walletId: 1,
      name: 'Test Account',
      accountType: AccountType.MULTISIG,
      type: 'universal' as const,
      cryptoType: CryptoType.SR25519,
      signingType: SigningType.WATCH_ONLY,
      signatories: [],
      threshold: 2,
    };

    const deepLinkData: MultisigOperationDeepLinkData = {
      chainId: mockChain.chainId,
      callHash: '0xabc123',
      accountId: mockAccountId as any,
      blockCreated: 100,
      indexCreated: 1,
    };

    const expectedOperationId = `${mockChain.chainId}-0xabc123-${mockAccountId}-100-1`;

    const mockOperation = {
      id: expectedOperationId,
      status: 'executed' as const,
      transaction: null,
      method: null,
      section: null,
      callHash: '0xabc123' as any,
      callData: null,
      chainId: mockChain.chainId,
      accountId: mockAccountId as any,
      depositor: mockAccountId as any,
      blockCreated: 100 as any,
      indexCreated: 1,
      events: [],
      timestamp: Date.now(),
    };

    const scope = fork({
      values: new Map()
        .set(networkModel.$chains, {
          [mockChain.chainId]: mockChain,
        })
        .set(accounts.__test.$list, [mockAccount])
        .set(accounts.__test.$populated, true)
        .set(multisigOperation.__test.$list, [mockOperation])
        .set(multisigOperation.__test.$populated, true)
        .set(networkModel.$apis, {}),
    });

    // Trigger deep link - should open modal
    await allSettled(deepLinkModel.multisigOperationDeepLinkHandler.triggered as any, {
      scope,
      params: deepLinkData,
    });

    expect(scope.getState(deepLinkModel.$isAlreadySignedModalOpen)).toBe(true);

    // User closes the modal
    await allSettled(deepLinkModel.closeAlreadySignedModal, { scope });

    expect(scope.getState(deepLinkModel.$isAlreadySignedModalOpen)).toBe(false);

    // User leaves the page - this resets all stores
    await allSettled(deepLinkModel.operationsPageClosed, { scope });

    // User comes back and the deep link is triggered again
    await allSettled(deepLinkModel.multisigOperationDeepLinkHandler.triggered as any, {
      scope,
      params: deepLinkData,
    });

    // Modal should open again because stores were reset (this is a fresh deep link)
    expect(scope.getState(deepLinkModel.$isAlreadySignedModalOpen)).toBe(true);

    // Close modal and just navigate away without page close
    await allSettled(deepLinkModel.closeAlreadySignedModal, { scope });
    expect(scope.getState(deepLinkModel.$isAlreadySignedModalOpen)).toBe(false);

    // Modal should stay closed even if operation list updates
    await allSettled(multisigOperation.__test.$list, {
      scope,
      params: [mockOperation],
    });

    expect(scope.getState(deepLinkModel.$isAlreadySignedModalOpen)).toBe(false);
  });
});
