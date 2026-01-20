import { allSettled, fork } from 'effector';
import { describe, expect, it } from 'vitest';

import { fetchOffchainResource, initialOnChainFetch } from './resource';
import { multisigOperation } from './store';

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
});
