import { allSettled, createWatch, fork } from 'effector';
import { describe, expect, it, vi } from 'vitest';

import { type ChainId } from '@/shared/core';
import { messageSignModel } from '@/features/operations/OperationMessageSign';
import { DEFAULT_AUTH_CHAIN_ID } from '../../lib/auth-chain';
import { authModel } from '../auth-model';
import { backendConfigurationModel } from '../backend-configuration-model';

const KUSAMA: ChainId = '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe';

describe('authModel — chain selector', () => {
  it('defaults $selectedChainId to Polkadot Asset Hub', () => {
    const scope = fork();
    expect(scope.getState(authModel.$selectedChainId)).toBe(DEFAULT_AUTH_CHAIN_ID);
  });

  it('chainSelected updates $selectedChainId', async () => {
    const scope = fork();
    await allSettled(authModel.events.chainSelected, { scope, params: KUSAMA });
    expect(scope.getState(authModel.$selectedChainId)).toBe(KUSAMA);
  });

  it('resets $selectedChainId to default on modalClosed', async () => {
    const scope = fork({ values: [[authModel.$selectedChainId, KUSAMA]] });
    expect(scope.getState(authModel.$selectedChainId)).toBe(KUSAMA);

    await allSettled(authModel.events.modalClosed, { scope });
    expect(scope.getState(authModel.$selectedChainId)).toBe(DEFAULT_AUTH_CHAIN_ID);
  });

  it('resets $selectedChainId to default on urlCleared', async () => {
    const scope = fork({ values: [[authModel.$selectedChainId, KUSAMA]] });
    await allSettled(backendConfigurationModel.events.urlCleared, { scope });
    expect(scope.getState(authModel.$selectedChainId)).toBe(DEFAULT_AUTH_CHAIN_ID);
  });

  it('forwards chain changes to messageSignModel.chainIdChanged while in signing step', async () => {
    const scope = fork({ values: [[authModel.$authStep, 'signing']] });

    const spy = vi.fn();
    createWatch({ unit: messageSignModel.chainIdChanged, fn: spy, scope });

    await allSettled(authModel.events.chainSelected, { scope, params: KUSAMA });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(KUSAMA);
  });

  it('does not forward chain changes when not in signing step', async () => {
    const scope = fork({ values: [[authModel.$authStep, 'selectAccount']] });

    const spy = vi.fn();
    createWatch({ unit: messageSignModel.chainIdChanged, fn: spy, scope });

    await allSettled(authModel.events.chainSelected, { scope, params: KUSAMA });

    expect(spy).not.toHaveBeenCalled();
  });
});
