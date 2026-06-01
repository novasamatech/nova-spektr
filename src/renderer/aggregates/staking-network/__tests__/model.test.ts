import { allSettled, fork } from 'effector';
import { describe, expect, it } from 'vitest';

import { AssetHubChains, DEFAULT_STAKING_CHAIN } from '@/domains/staking';
import { stakingNetwork } from '../model';

describe('stakingNetwork', () => {
  it('defaults selected chain to the default staking chain', () => {
    const scope = fork();

    expect(scope.getState(stakingNetwork.$selectedChainId)).toBe(DEFAULT_STAKING_CHAIN);
  });

  it('updates selected chain when selecting another staking chain', async () => {
    const scope = fork();

    await allSettled(stakingNetwork.selectChain, { scope, params: AssetHubChains.KUSAMA_AH });

    expect(scope.getState(stakingNetwork.$selectedChainId)).toBe(AssetHubChains.KUSAMA_AH);
  });
});
