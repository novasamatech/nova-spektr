import { type UnitTargetable, allSettled, fork } from 'effector';
import { type MockInstance, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../components/Operation', () => ({
  operationTitleTransformer: { createTransformer: () => {} },
}));

vi.mock('@/shared/api/storage', () => ({
  storageService: {},
  persist: vi.fn(),
}));

import { createAccountId, polkadotChainId } from '@/shared/mocks';
import * as backendApi from '@/domains/api';
import { type MultisigOperation, multisigOperation } from '@/domains/network';
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
    vi.clearAllMocks();
    fetchSpy = vi.spyOn(backendApi, 'fetchOperationsByIds').mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should fetch all descriptions on authentication', async () => {
    const op1 = createMockOperation('0x111');
    const op2 = createMockOperation('0x222');

    fetchSpy.mockResolvedValue([
      { id: op1.id, description: 'Desc 1' },
      { id: op2.id, description: 'Desc 2' },
    ]);

    const scope = fork({
      values: new Map()
        .set(backendConfigurationModel.$backendUrl, 'https://backend.test')
        .set(authModel.$authState, null)
        .set(multisigOperation.__test.$cachedOperations, [op1, op2])
        .set(multisigOperation.__test.$populated, true),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await allSettled(authModel.$authState as UnitTargetable<any>, { scope, params: authenticatedState });

    expect(fetchSpy).toHaveBeenCalledWith('https://backend.test', [op1.id, op2.id]);
    expect(scope.getState(operationDescriptionsModel.$descriptions)).toEqual({
      [op1.id]: 'Desc 1',
      [op2.id]: 'Desc 2',
    });
  });

  it('should skip already-cached descriptions on auth fetch', async () => {
    const op1 = createMockOperation('0x111');
    const op2 = createMockOperation('0x222');

    fetchSpy.mockResolvedValue([{ id: op2.id, description: 'Desc 2' }]);

    const scope = fork({
      values: new Map()
        .set(backendConfigurationModel.$backendUrl, 'https://backend.test')
        .set(authModel.$authState, null)
        .set(multisigOperation.__test.$cachedOperations, [op1, op2])
        .set(multisigOperation.__test.$populated, true)
        .set(operationDescriptionsModel.$descriptions, { [op1.id]: 'Cached desc' }),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await allSettled(authModel.$authState as UnitTargetable<any>, { scope, params: authenticatedState });

    // Only op2 should be fetched — op1 already in cache
    expect(fetchSpy).toHaveBeenCalledWith('https://backend.test', [op2.id]);
    expect(scope.getState(operationDescriptionsModel.$descriptions)).toEqual({
      [op1.id]: 'Cached desc',
      [op2.id]: 'Desc 2',
    });
  });

  it('should only fetch new operations on list update (pairwise delta)', async () => {
    const op1 = createMockOperation('0x111');
    const op2 = createMockOperation('0x222');

    const scope = fork({
      values: new Map()
        .set(backendConfigurationModel.$backendUrl, 'https://backend.test')
        .set(authModel.$authState, authenticatedState)
        .set(multisigOperation.__test.$cachedOperations, []),
    });

    // 1st change: pairwise records prev=[], doesn't fire (INITIAL → [op1])
    await allSettled(multisigOperation.__test.$cachedOperations, { scope, params: [op1] });

    fetchSpy.mockClear();
    fetchSpy.mockResolvedValue([{ id: op2.id, description: 'Desc 2' }]);

    // 2nd change: pairwise fires with prev=[op1], current=[op1, op2] → delta=[op2]
    await allSettled(multisigOperation.__test.$cachedOperations, { scope, params: [op1, op2] });

    expect(fetchSpy).toHaveBeenCalledWith('https://backend.test', [op2.id]);
    expect(scope.getState(operationDescriptionsModel.$descriptions)).toEqual({
      [op2.id]: 'Desc 2',
    });
  });

  it('should not fetch delta when not authenticated', async () => {
    const op1 = createMockOperation('0x111');
    const op2 = createMockOperation('0x222');

    const scope = fork({
      values: new Map()
        .set(backendConfigurationModel.$backendUrl, 'https://backend.test')
        .set(authModel.$authState, null)
        .set(multisigOperation.__test.$cachedOperations, []),
    });

    // 1st change: pairwise records
    await allSettled(multisigOperation.__test.$cachedOperations, { scope, params: [op1] });
    // 2nd change: pairwise fires, but not authenticated
    await allSettled(multisigOperation.__test.$cachedOperations, { scope, params: [op1, op2] });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('should not fetch delta when no backend URL', async () => {
    const op1 = createMockOperation('0x111');
    const op2 = createMockOperation('0x222');

    const scope = fork({
      values: new Map()
        .set(backendConfigurationModel.$backendUrl, null)
        .set(authModel.$authState, authenticatedState)
        .set(multisigOperation.__test.$cachedOperations, []),
    });

    await allSettled(multisigOperation.__test.$cachedOperations, { scope, params: [op1] });
    await allSettled(multisigOperation.__test.$cachedOperations, { scope, params: [op1, op2] });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('should only store non-null descriptions from API', async () => {
    const op1 = createMockOperation('0x111');
    const op2 = createMockOperation('0x222');

    fetchSpy.mockResolvedValue([
      { id: op1.id, description: 'Has description' },
      { id: op2.id, description: null },
    ]);

    const scope = fork({
      values: new Map()
        .set(backendConfigurationModel.$backendUrl, 'https://backend.test')
        .set(authModel.$authState, null)
        .set(multisigOperation.__test.$cachedOperations, [op1, op2])
        .set(multisigOperation.__test.$populated, true),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await allSettled(authModel.$authState as UnitTargetable<any>, { scope, params: authenticatedState });

    expect(scope.getState(operationDescriptionsModel.$descriptions)).toEqual({
      [op1.id]: 'Has description',
    });
  });

  it('should not fetch delta when no new operations (same list)', async () => {
    const op1 = createMockOperation('0x111');

    const scope = fork({
      values: new Map()
        .set(backendConfigurationModel.$backendUrl, 'https://backend.test')
        .set(authModel.$authState, authenticatedState)
        .set(multisigOperation.__test.$cachedOperations, []),
    });

    // 1st change: pairwise records
    await allSettled(multisigOperation.__test.$cachedOperations, { scope, params: [op1] });
    fetchSpy.mockClear();

    // 2nd change: same operations — no new IDs, filter blocks
    await allSettled(multisigOperation.__test.$cachedOperations, { scope, params: [op1] });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('should clear descriptions on urlCleared', async () => {
    const scope = fork({
      values: new Map().set(operationDescriptionsModel.$descriptions, { 'op-1': 'desc' }),
    });

    await allSettled(backendConfigurationModel.events.urlCleared, { scope });

    expect(scope.getState(operationDescriptionsModel.$descriptions)).toEqual({});
  });
});
