import { allSettled, createEvent, fork, sample } from 'effector';
import { describe, expect, it } from 'vitest';

import { type ChainId, AccountType } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { accounts } from '../account/store';

import { $completionEvents, fetchOffchainResource, initialOnChainFetch } from './resource';
import { multisigOperation } from './store';
import { type MultisigEvent, type MultisigOperation } from './types';

describe('multisigOperation store', () => {
  const mockChainId1 = '0x123' as ChainId;
  const mockChainId2 = '0x456' as ChainId;

  const mockApis = {
    [mockChainId1]: {
      genesisHash: { toHex: () => mockChainId1 },
      query: { system: { events: () => Promise.resolve() } },
    } as any,
    [mockChainId2]: {
      genesisHash: { toHex: () => mockChainId2 },
      query: { system: { events: () => Promise.resolve() } },
    } as any,
  };

  const mockChains = {
    [mockChainId1]: { chainId: mockChainId1 } as any,
    [mockChainId2]: { chainId: mockChainId2 } as any,
  };

  it('should have initialLoadingComplete as false by default', () => {
    const scope = fork();
    expect(scope.getState(multisigOperation.$initialLoadingComplete)).toBe(false);
  });

  it('should set initialLoadingComplete to true only when both resources are fetched for all expected chains', async () => {
    const scope = fork({
      handlers: new Map<any, any>([
        [
          initialOnChainFetch.fetch,
          async ({ api }: any) => ({ chainId: api.genesisHash.toHex(), callHashesByAccount: {}, onChainData: {} }),
        ],
        [fetchOffchainResource.fetch, async () => []],
      ]),
    });

    // Subscribe with expected chains
    await allSettled(multisigOperation.subscribeToAccounts, {
      scope,
      params: {
        apis: mockApis,
        chains: mockChains,
        accountIds: ['account1'] as any,
      },
    });

    // At this point, subscribeToAccounts has automatically triggered both fetches
    // Wait a bit for async operations
    await new Promise(resolve => setTimeout(resolve, 10));
    await allSettled(scope);

    // Both on-chain and off-chain are done for all expected chains
    expect(scope.getState(multisigOperation.$initialLoadingComplete)).toBe(true);
  });

  it('should NOT mark initialLoadingComplete as true if not all expected chains have fetched', async () => {
    const scope = fork({
      handlers: new Map<any, any>([
        [
          initialOnChainFetch.fetch,
          async ({ api }: any) => ({ chainId: api.genesisHash.toHex(), callHashesByAccount: {}, onChainData: {} }),
        ],
        [fetchOffchainResource.fetch, async () => []],
      ]),
    });

    const partialApis = { [mockChainId1]: mockApis[mockChainId1] };

    // Subscribe with 2 expected chains but only 1 API connected
    await allSettled(multisigOperation.subscribeToAccounts, {
      scope,
      params: {
        apis: partialApis, // Only chain 1 API
        chains: mockChains, // Expects both chain 1 and chain 2
        accountIds: ['account1'] as any,
      },
    });

    // Wait for initial fetches to complete
    await new Promise(resolve => setTimeout(resolve, 10));
    await allSettled(scope);

    // Not all expected chains have fetched (only chain 1), should remain false
    expect(scope.getState(multisigOperation.$initialLoadingComplete)).toBe(false);

    // Now simulate the second chain's API connecting - trigger its fetch manually
    await allSettled(initialOnChainFetch.fetch, {
      scope,
      params: { api: mockApis[mockChainId2], chain: mockChains[mockChainId2], accountIds: ['account1'] } as any,
    });

    // Now all expected chains have fetched, should be true
    expect(scope.getState(multisigOperation.$initialLoadingComplete)).toBe(true);
  });

  it('should reset initialLoadingComplete when unsubscribing', async () => {
    const scope = fork({
      handlers: new Map<any, any>([
        [
          initialOnChainFetch.fetch,
          async ({ api }: any) => ({ chainId: api.genesisHash.toHex(), callHashesByAccount: {}, onChainData: {} }),
        ],
        [fetchOffchainResource.fetch, async () => []],
      ]),
    });

    // Subscribe and complete loading
    await allSettled(multisigOperation.subscribeToAccounts, {
      scope,
      params: {
        apis: mockApis,
        chains: mockChains,
        accountIds: ['account1'] as any,
      },
    });

    // Wait for all fetches to complete
    await new Promise(resolve => setTimeout(resolve, 10));
    await allSettled(scope);

    expect(scope.getState(multisigOperation.$initialLoadingComplete)).toBe(true);

    // Unsubscribe
    await allSettled(multisigOperation.unsubscribeFromAccounts, { scope });

    expect(scope.getState(multisigOperation.$initialLoadingComplete)).toBe(false);
  });

  describe('orphan cached-operation eviction', () => {
    const ORPHAN_ID = '0xorphan' as AccountId;
    const LIVE_ID = '0xlive' as AccountId;
    const FLEX_INNER_ID = '0xflexinner' as AccountId;

    const orphanOp = { id: 'o1', multisigAccountId: ORPHAN_ID, status: 'pending' } as unknown as MultisigOperation;
    const liveOp = { id: 'l1', multisigAccountId: LIVE_ID, status: 'pending' } as unknown as MultisigOperation;
    const flexOp = { id: 'f1', multisigAccountId: FLEX_INNER_ID, status: 'pending' } as unknown as MultisigOperation;

    const plainMultisig = {
      id: 'acc-1',
      type: 'universal',
      accountType: AccountType.MULTISIG,
      accountId: LIVE_ID,
      walletId: 1,
      name: 'live',
    } as any;

    const flexMultisig = {
      id: 'acc-2',
      type: 'chain',
      accountType: AccountType.FLEX_MULTISIG,
      accountId: '0xflexproxy' as AccountId,
      multisigAccountId: FLEX_INNER_ID,
      walletId: 2,
      name: 'flex',
    } as any;

    const nukeAccounts = createEvent<(typeof plainMultisig)[]>();
    sample({ clock: nukeAccounts, target: accounts.__test.$list });

    it('evicts cached ops whose multisigAccountId has no matching live multisig account', async () => {
      const scope = fork({
        values: new Map<any, any>([
          [multisigOperation.__test.$cachedOperations, [orphanOp, liveOp]],
          [accounts.__test.$list, []],
        ]),
      });

      // Fire an accounts update so the cleanup sample runs
      await allSettled(nukeAccounts, { scope, params: [plainMultisig] });

      const cached = scope.getState(multisigOperation.__test.$cachedOperations);
      expect(cached).toEqual([liveOp]);
    });

    it('preserves flexible-multisig cached ops when the flex wallet is still present', async () => {
      const scope = fork({
        values: new Map<any, any>([
          [multisigOperation.__test.$cachedOperations, [flexOp, orphanOp]],
          [accounts.__test.$list, []],
        ]),
      });

      await allSettled(nukeAccounts, { scope, params: [flexMultisig] });

      const cached = scope.getState(multisigOperation.__test.$cachedOperations);
      expect(cached).toEqual([flexOp]);
    });

    it('drops every cached op when zero multisig accounts remain', async () => {
      const scope = fork({
        values: new Map<any, any>([
          [multisigOperation.__test.$cachedOperations, [orphanOp, liveOp, flexOp]],
          [accounts.__test.$list, []],
        ]),
      });

      await allSettled(nukeAccounts, { scope, params: [] });

      expect(scope.getState(multisigOperation.__test.$cachedOperations)).toEqual([]);
    });

    it('keeps the same array reference when nothing is evicted (no-op update)', async () => {
      const original = [liveOp];
      const scope = fork({
        values: new Map<any, any>([
          [multisigOperation.__test.$cachedOperations, original],
          [accounts.__test.$list, []],
        ]),
      });

      await allSettled(nukeAccounts, { scope, params: [plainMultisig] });

      expect(scope.getState(multisigOperation.__test.$cachedOperations)).toBe(original);
    });
  });

  describe('live-completion status derivation', () => {
    const MULTI_ID = '0xmulti' as AccountId;

    const baseOp = {
      id: 'op-1',
      status: 'pending',
      multisigAccountId: MULTI_ID,
      chainId: mockChainId1,
      events: [],
    } as unknown as MultisigOperation;

    const approveEvent: MultisigEvent = { id: 'e-approve', status: 'approve' } as unknown as MultisigEvent;
    const rejectEvent: MultisigEvent = { id: 'e-reject', status: 'reject' } as unknown as MultisigEvent;

    const completion = (event: MultisigEvent, executionResult: 'success' | 'error' | null) => ({
      chainId: mockChainId1,
      operationId: baseOp.id,
      event,
      executionResult,
    });

    const deriveStatus = async (
      completionEvents: ReturnType<typeof completion>[],
    ): Promise<MultisigOperation['status'] | undefined> => {
      const scope = fork({
        values: new Map<any, any>([
          [multisigOperation.__test.$removedFromChainStorageOperations, [baseOp]],
          [$completionEvents, completionEvents],
        ]),
      });

      const derived = scope.getState(multisigOperation.__test.$completedLiveOperations);
      return derived[0]?.status;
    };

    it('marks a successful MultisigExecuted as executed', async () => {
      expect(await deriveStatus([completion(approveEvent, 'success')])).toBe('executed');
    });

    it('marks a failed inner-call MultisigExecuted as error', async () => {
      expect(await deriveStatus([completion(approveEvent, 'error')])).toBe('error');
    });

    it('marks a MultisigCancelled as cancelled, taking precedence over a failed execution', async () => {
      expect(await deriveStatus([completion(rejectEvent, null), completion(approveEvent, 'error')])).toBe('cancelled');
    });

    it('keeps a removed operation pending when only an approval was caught', async () => {
      // A MultisigApproval carries no executionResult — the entry vanished from
      // storage, but whether it executed or was cancelled is unknown here.
      expect(await deriveStatus([completion(approveEvent, null)])).toBe('pending');
    });

    it('keeps a removed operation pending when no completion event was caught', async () => {
      expect(await deriveStatus([])).toBe('pending');
    });

    it('marks an unresolved removed operation as awaiting outcome and unions caught approvals', async () => {
      const storageEvent: MultisigEvent = { id: 'e-storage', status: 'approve' } as unknown as MultisigEvent;
      const opWithEvents = { ...baseOp, events: [storageEvent] };

      const scope = fork({
        values: new Map<any, any>([
          [multisigOperation.__test.$removedFromChainStorageOperations, [opWithEvents]],
          [$completionEvents, [completion(approveEvent, null)]],
        ]),
      });

      const [derived] = scope.getState(multisigOperation.__test.$completedLiveOperations);
      expect(derived?.awaitingOutcome).toBe(true);
      expect(derived?.events.map(e => e.id).sort()).toEqual(['e-approve', 'e-storage']);
    });

    it('does not mark a resolved operation as awaiting outcome', async () => {
      const scope = fork({
        values: new Map<any, any>([
          [multisigOperation.__test.$removedFromChainStorageOperations, [baseOp]],
          [$completionEvents, [completion(approveEvent, 'success')]],
        ]),
      });

      const [derived] = scope.getState(multisigOperation.__test.$completedLiveOperations);
      expect(derived?.status).toBe('executed');
      expect(derived?.awaitingOutcome).toBeUndefined();
    });

    it('appends the executor approval to the storage-derived events', async () => {
      const storageEvent: MultisigEvent = { id: 'e-storage', status: 'approve' } as unknown as MultisigEvent;
      const opWithEvents = { ...baseOp, events: [storageEvent] };

      const scope = fork({
        values: new Map<any, any>([
          [multisigOperation.__test.$removedFromChainStorageOperations, [opWithEvents]],
          [$completionEvents, [completion(approveEvent, 'success')]],
        ]),
      });

      const [derived] = scope.getState(multisigOperation.__test.$completedLiveOperations);
      expect(derived?.events.map(e => e.id).sort()).toEqual(['e-approve', 'e-storage']);
    });
  });
});
