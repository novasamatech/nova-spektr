import { allSettled, fork } from 'effector';
import { type MockInstance, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../components/Operation', () => ({
  operationTitleTransformer: { createTransformer: () => {} },
}));

import { createAccountId, polkadotChainId } from '@/shared/mocks';
import { type MultisigOperation, multisigOperation } from '@/domains/network';
import * as backendAuth from '@/aggregates/backend-auth';
import { authModel, backendConfigurationModel } from '@/aggregates/backend-auth';

import { operationDescriptionsModel } from './operation-descriptions-model';

const mockAccountId = createAccountId(1);

const createMockOperation = (callHash = '0xabc123', block = 100, index = 1) => {
  const id = `${polkadotChainId}-${callHash}-${mockAccountId}-${block}-${index}`;

  return {
    id,
    status: 'pending',
    transaction: null,
    method: null,
    section: null,
    callHash,
    callData: null,
    chainId: polkadotChainId,
    multisigAccountId: mockAccountId,
    depositor: mockAccountId,
    blockCreated: block,
    indexCreated: index,
    events: [],
    timestamp: Date.now(),
  } as unknown as MultisigOperation;
};

const authenticatedState = { accountId: mockAccountId, permissions: [] };

describe('operation-descriptions-model', () => {
  let fetchSpy: MockInstance;

  beforeEach(() => {
    fetchSpy = vi.spyOn(backendAuth, 'fetchOperationsByIds').mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should fetch descriptions when operations list updates while authenticated', async () => {
    const op = createMockOperation('0xaaa');

    fetchSpy.mockResolvedValue([{ id: op.id, description: 'Test description' }]);

    const scope = fork({
      values: new Map()
        .set(backendConfigurationModel.$backendUrl, 'https://backend.test')
        .set(authModel.$authState, authenticatedState)
        .set(multisigOperation.__test.$cachedOperations, []),
    });

    await allSettled(multisigOperation.__test.$cachedOperations, { scope, params: [op] });

    expect(fetchSpy).toHaveBeenCalledWith('https://backend.test', [op.id]);
    expect(scope.getState(operationDescriptionsModel.$descriptions)).toEqual({
      [op.id]: 'Test description',
    });
  });

  it('should not fetch when not authenticated', async () => {
    const op = createMockOperation('0xbbb');

    const scope = fork({
      values: new Map()
        .set(backendConfigurationModel.$backendUrl, 'https://backend.test')
        .set(authModel.$authState, null)
        .set(multisigOperation.__test.$cachedOperations, []),
    });

    await allSettled(multisigOperation.__test.$cachedOperations, { scope, params: [op] });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('should not fetch when no backend URL', async () => {
    const op = createMockOperation('0xccc');

    const scope = fork({
      values: new Map()
        .set(backendConfigurationModel.$backendUrl, null)
        .set(authModel.$authState, authenticatedState)
        .set(multisigOperation.__test.$cachedOperations, []),
    });

    await allSettled(multisigOperation.__test.$cachedOperations, { scope, params: [op] });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('should not fetch when operations list is empty', async () => {
    const scope = fork({
      values: new Map()
        .set(backendConfigurationModel.$backendUrl, 'https://backend.test')
        .set(authModel.$authState, authenticatedState)
        .set(multisigOperation.__test.$cachedOperations, [createMockOperation()]),
    });

    await allSettled(multisigOperation.__test.$cachedOperations, { scope, params: [] });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('should clear descriptions on urlCleared', async () => {
    const scope = fork({
      values: new Map().set(operationDescriptionsModel.$descriptions, { 'op-1': 'desc' }),
    });

    await allSettled(backendConfigurationModel.events.urlCleared, { scope });

    expect(scope.getState(operationDescriptionsModel.$descriptions)).toEqual({});
  });

  it('should only include operations with non-null descriptions', async () => {
    const op1 = createMockOperation('0x111');
    const op2 = createMockOperation('0x222');

    fetchSpy.mockResolvedValue([
      { id: op1.id, description: 'Has description' },
      { id: op2.id, description: null },
    ]);

    const scope = fork({
      values: new Map()
        .set(backendConfigurationModel.$backendUrl, 'https://backend.test')
        .set(authModel.$authState, authenticatedState)
        .set(multisigOperation.__test.$cachedOperations, []),
    });

    await allSettled(multisigOperation.__test.$cachedOperations, { scope, params: [op1, op2] });

    expect(scope.getState(operationDescriptionsModel.$descriptions)).toEqual({
      [op1.id]: 'Has description',
    });
  });

  it('should pass all operation ids to the API', async () => {
    const op1 = createMockOperation('0x111');
    const op2 = createMockOperation('0x222');
    const op3 = createMockOperation('0x333');

    const scope = fork({
      values: new Map()
        .set(backendConfigurationModel.$backendUrl, 'https://backend.test')
        .set(authModel.$authState, authenticatedState)
        .set(multisigOperation.__test.$cachedOperations, []),
    });

    await allSettled(multisigOperation.__test.$cachedOperations, { scope, params: [op1, op2, op3] });

    expect(fetchSpy).toHaveBeenCalledWith('https://backend.test', [op1.id, op2.id, op3.id]);
  });
});
