import { allSettled, fork } from 'effector';
import { describe, expect, it } from 'vitest';

import { type ChainId } from '@/shared/core';

import { fetchOffchainResource, initialOnChainFetch } from './resource';
import { multisigOperation } from './store';

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
});
