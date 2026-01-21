import { allSettled, fork } from 'effector';
import { describe, expect, it } from 'vitest';

import { type HexString } from '@/shared/core';
import { type AccountId, type BlockHeight } from '@/shared/polkadotjs-schemas';

import {
  $offChainOperations,
  $onChainOperationsByCallhash,
  fetchOffchainResource,
  initialOnChainFetch,
} from './resource';
import { multisigOperation } from './store';
import { type MultisigOperation } from './types';

const createMockOperation = (overrides: Partial<MultisigOperation> = {}): MultisigOperation => ({
  id: `op-${Date.now()}-${Math.random()}`,
  status: 'pending',
  transaction: null,
  method: 'transfer',
  section: 'balances',
  callHash: '0x1234' as HexString,
  callData: null,
  chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3' as any,
  accountId: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY' as AccountId,
  depositor: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY' as AccountId,
  blockCreated: 1000 as BlockHeight,
  indexCreated: 0,
  events: [],
  timestamp: Date.now(),
  ...overrides,
});

describe('multisigOperation store', () => {
  it('should have initialLoadingComplete as false by default', () => {
    const scope = fork();
    expect(scope.getState(multisigOperation.$initialLoadingComplete)).toBe(false);
  });

  it('should set initialLoadingComplete to true only when both resources are fetched', async () => {
    const scope = fork({
      handlers: new Map<any, any>([
        [initialOnChainFetch.fetch, async () => ({ callHashesByChain: {}, onChainData: {} })],
        [fetchOffchainResource.fetch, async () => []],
      ]),
    });

    // Trigger on-chain fetch completion
    await allSettled(initialOnChainFetch.fetch, {
      scope,
      params: {} as any,
    });

    expect(scope.getState(multisigOperation.$initialLoadingComplete)).toBe(false);

    // Trigger off-chain fetch completion
    await allSettled(fetchOffchainResource.fetch, {
      scope,
      params: {} as any,
    });

    expect(scope.getState(multisigOperation.$initialLoadingComplete)).toBe(true);
  });

  it('should reset initialLoadingComplete when unsubscribing', async () => {
    const scope = fork({
      handlers: new Map<any, any>([
        [initialOnChainFetch.fetch, async () => ({ callHashesByChain: {}, onChainData: {} })],
        [fetchOffchainResource.fetch, async () => []],
      ]),
    });

    // Complete loading
    await allSettled(initialOnChainFetch.fetch, {
      scope,
      params: {} as any,
    });
    await allSettled(fetchOffchainResource.fetch, {
      scope,
      params: {} as any,
    });

    expect(scope.getState(multisigOperation.$initialLoadingComplete)).toBe(true);

    // Unsubscribe
    await allSettled(multisigOperation.unsubscribeFromAccounts, { scope });

    expect(scope.getState(multisigOperation.$initialLoadingComplete)).toBe(false);
  });

  describe('persistence', () => {
    it('should populate $offChainOperations from populateFx.doneData', async () => {
      const mockDbOperations = [createMockOperation({ id: 'db-op-1' }), createMockOperation({ id: 'db-op-2' })];

      const scope = fork({
        handlers: new Map<any, any>([[multisigOperation.populate!, async () => mockDbOperations]]),
      });

      await allSettled(multisigOperation.populate!, { scope });

      // DB operations should be included in the final list (merged into offChainOperations)
      const list = scope.getState(multisigOperation.$list);
      expect(list).toHaveLength(2);
      expect(list.map(op => op.id)).toContain('db-op-1');
      expect(list.map(op => op.id)).toContain('db-op-2');
    });

    it('should prioritize on-chain data over DB cache', async () => {
      const dbOperation = createMockOperation({
        id: 'shared-op-id',
        status: 'pending',
        method: 'old_method', // Stale DB data
      });

      const onChainOperation = createMockOperation({
        id: 'shared-op-id', // Same ID
        status: 'pending',
        method: 'new_method', // Fresh on-chain data
      });

      const scope = fork({
        handlers: new Map<any, any>([[multisigOperation.populate!, async () => [dbOperation]]]),
        values: new Map<any, any>([[$onChainOperationsByCallhash, { [onChainOperation.callHash]: onChainOperation }]]),
      });

      // DB data gets merged into $offChainOperations, but on-chain still has priority in combine
      await allSettled(multisigOperation.populate!, { scope });

      const list = scope.getState(multisigOperation.$list);
      expect(list).toHaveLength(1);
      expect(list[0]!.method).toBe('new_method'); // On-chain wins
    });

    it('should prioritize existing off-chain data over DB cache', async () => {
      const dbOperation = createMockOperation({
        id: 'shared-op-id',
        status: 'cancelled',
        method: 'old_method',
      });

      const offChainOperation = createMockOperation({
        id: 'shared-op-id',
        status: 'executed', // Indexer data
        method: 'updated_method',
      });

      // Pre-populate $offChainOperations with indexer data
      const scope = fork({
        handlers: new Map<any, any>([[multisigOperation.populate!, async () => [dbOperation]]]),
        values: new Map<any, any>([[$offChainOperations, [offChainOperation]]]),
      });

      // DB data merges into $offChainOperations but existing data has priority via merge function
      await allSettled(multisigOperation.populate!, { scope });

      const list = scope.getState(multisigOperation.$list);
      expect(list).toHaveLength(1);
      expect(list[0]!.status).toBe('executed'); // Existing indexer data wins
    });

    it('should include unique operations from all sources', async () => {
      const dbOnlyOp = createMockOperation({ id: 'db-only' });
      const onChainOnlyOp = createMockOperation({ id: 'onchain-only' });
      const offChainOnlyOp = createMockOperation({ id: 'offchain-only' });

      const scope = fork({
        handlers: new Map<any, any>([[multisigOperation.populate!, async () => [dbOnlyOp]]]),
        values: new Map<any, any>([
          [$onChainOperationsByCallhash, { ['0xabc' as HexString]: onChainOnlyOp }],
          [$offChainOperations, [offChainOnlyOp]],
        ]),
      });

      await allSettled(multisigOperation.populate!, { scope });

      const list = scope.getState(multisigOperation.$list);
      expect(list).toHaveLength(3);
      expect(list.map(op => op.id)).toContain('db-only');
      expect(list.map(op => op.id)).toContain('onchain-only');
      expect(list.map(op => op.id)).toContain('offchain-only');
    });
  });
});
