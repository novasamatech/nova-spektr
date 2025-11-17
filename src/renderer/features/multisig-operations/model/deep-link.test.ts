import { allSettled, fork } from 'effector';
import { describe, expect, it } from 'vitest';

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
        .set(accounts.__test.$list, []),
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
      type: 'multisig' as const,
      signatories: [],
      threshold: 2,
      chainId: mockChain.chainId,
    };

    const scope = fork({
      values: new Map()
        .set(networkModel.$chains, {
          [mockChain.chainId]: mockChain,
        })
        .set(accounts.__test.$list, [mockAccount]),
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
      type: 'multisig' as const,
      signatories: [],
      threshold: 2,
      chainId: mockChain.chainId,
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
        .set(multisigOperation.$list, [mockOperation])
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
});
