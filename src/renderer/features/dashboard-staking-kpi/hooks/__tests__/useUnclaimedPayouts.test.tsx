import { type ApiPromise } from '@polkadot/api';
import { TypeRegistry, u32 } from '@polkadot/types';
import { act, renderHook } from '@testing-library/react';
import { type Scope, allSettled, fork } from 'effector';
import { Provider, useUnit } from 'effector-react';
import { type PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type Chain, type ChainId } from '@/shared/core';
import {
  createAccountId,
  kusamaAssetHubChainId,
  kusamaChain,
  kusamaChainId,
  polkadotAssetHubChain,
} from '@/shared/mocks';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import {
  type PayoutsResourceParams,
  type StakingPosition,
  type UnclaimedPayouts,
  type payoutsService,
  payouts,
  payoutsCacheKey,
} from '@/domains/staking';
import { networkModel } from '@/entities/network';
import { unclaimedKey, useUnclaimedPayoutsByPosition } from '../useUnclaimedPayouts';

import { $eraCache } from './domainMocks';

type PayoutsServiceModule = { getUnclaimedPayouts: typeof payoutsService.getUnclaimedPayouts };

/**
 * The per-stash scan is the boundary: everything from the resource's request
 * cache and `invalidate` down to the hook's own `retry` is the real thing.
 */
const scan = vi.hoisted(() => vi.fn<PayoutsServiceModule['getUnclaimedPayouts']>());

vi.mock('@/domains/staking/payouts/service', async (importOriginal) => {
  const actual = await importOriginal<PayoutsServiceModule>();

  return { ...actual, getUnclaimedPayouts: scan };
});

vi.mock('../useChainEras', async () => {
  const { $eraCache } = await import('./domainMocks');

  return { useChainEras: () => useUnit($eraCache) };
});

// The pool `start`s requests outside the fork; the entries are seeded through
// the scoped `fetch` instead.
vi.mock('../useResourcePool', () => ({ useResourcePool: () => undefined }));

const { payoutsResource } = payouts;

const POLKADOT_AH = polkadotAssetHubChain.chainId;
const KUSAMA_AH = kusamaAssetHubChainId;

const kusamaAssetHubChain: Chain = {
  ...kusamaChain,
  chainId: KUSAMA_AH,
  parentId: kusamaChainId,
  name: 'Kusama Asset Hub',
};

const chains: Record<ChainId, Chain> = {
  [POLKADOT_AH]: polkadotAssetHubChain,
  [KUSAMA_AH]: kusamaAssetHubChain,
};

const registry = new TypeRegistry();
const api = { consts: { staking: { historyDepth: new u32(registry, 84) } } } as unknown as ApiPromise;
const apis: Record<ChainId, ApiPromise> = { [POLKADOT_AH]: api, [KUSAMA_AH]: api };

const POLKADOT_ERA = 100;
const KUSAMA_ERA = 200;
const ERAS: Record<ChainId, number> = { [POLKADOT_AH]: POLKADOT_ERA, [KUSAMA_AH]: KUSAMA_ERA };

const PARTIAL: UnclaimedPayouts = { total: '0', payouts: [], source: 'chain', completeness: 'partial' };
const COMPLETE: UnclaimedPayouts = { total: '0', payouts: [], source: 'subquery', completeness: 'complete' };

const position = (chainId: ChainId, accountId: AccountId): StakingPosition => ({
  accountId,
  chainId,
  stake: { accountId, chainId, controller: accountId, stash: accountId, active: '1', total: '1', unlocking: [] },
  status: 'active',
  statusReason: null,
  kind: 'nominator',
  validator: null,
  nominations: [],
  activeValidators: [],
  unbonding: [],
  redeemable: '0',
  totalUnbonding: '0',
  payee: 'Staked',
  payeeLoaded: true,
});

const request = (chainId: ChainId, stash: AccountId): PayoutsResourceParams => ({
  chainId,
  api,
  stash,
  activeEra: ERAS[chainId]!,
  historyDepth: 84,
  rewardSources: [],
});

const wrapperFor = (scope: Scope) => {
  const Wrapper = ({ children }: PropsWithChildren) => <Provider value={scope}>{children}</Provider>;

  return Wrapper;
};

const forkScope = () =>
  fork({
    values: [
      [networkModel.$chains, chains],
      [networkModel.$apis, apis],
      [$eraCache, ERAS],
    ],
  });

/**
 * Lands an answer for the stash in the scope's cache, the way a first scan
 * would.
 */
const seedScan = async (scope: Scope, params: PayoutsResourceParams, answer: UnclaimedPayouts) => {
  scan.mockResolvedValueOnce(answer);
  await allSettled(payoutsResource.fetch, { scope, params });
};

describe('useUnclaimedPayoutsByPosition · retry', () => {
  beforeEach(() => {
    scan.mockReset();
  });

  it('SP-44: retry re-runs only the scans that did not answer completely', async () => {
    const polkadotStash = createAccountId('retry-polkadot');
    const kusamaStash = createAccountId('retry-kusama');
    const scope = forkScope();

    await seedScan(scope, request(POLKADOT_AH, polkadotStash), PARTIAL);
    await seedScan(scope, request(KUSAMA_AH, kusamaStash), COMPLETE);
    expect(scan).toHaveBeenCalledTimes(2);

    const positions = [position(POLKADOT_AH, polkadotStash), position(KUSAMA_AH, kusamaStash)];
    const { result } = renderHook(() => useUnclaimedPayoutsByPosition(positions), { wrapper: wrapperFor(scope) });

    expect(result.current.byPosition[unclaimedKey(POLKADOT_AH, polkadotStash)]).toEqual(PARTIAL);
    expect(result.current.byPosition[unclaimedKey(KUSAMA_AH, kusamaStash)]).toEqual(COMPLETE);

    scan.mockClear();
    scan.mockResolvedValue(COMPLETE);

    await act(() => result.current.retry());

    // One scan, for the one stash whose answer was partial — the complete
    // Kusama answer is left alone.
    expect(scan).toHaveBeenCalledTimes(1);
    expect(scan.mock.calls[0]![0]).toMatchObject({ stash: polkadotStash, activeEra: POLKADOT_ERA });

    expect(result.current.byPosition[unclaimedKey(POLKADOT_AH, polkadotStash)]).toEqual(COMPLETE);
    expect(scope.getState(payoutsResource.$cache)[payoutsCacheKey(POLKADOT_AH, polkadotStash, POLKADOT_ERA)]).toEqual(
      COMPLETE,
    );
  });

  it('SP-44: retry does nothing once every scan has answered completely', async () => {
    const polkadotStash = createAccountId('settled-polkadot');
    const scope = forkScope();

    await seedScan(scope, request(POLKADOT_AH, polkadotStash), COMPLETE);

    const positions = [position(POLKADOT_AH, polkadotStash)];
    const { result } = renderHook(() => useUnclaimedPayoutsByPosition(positions), { wrapper: wrapperFor(scope) });

    scan.mockClear();
    await act(() => result.current.retry());

    expect(scan).not.toHaveBeenCalled();
  });

  it('SP-44: a scan that never answered is retried too', async () => {
    // "Not complete" covers the unavailable answer as much as the partial one:
    // an indexer that was down at first load must be asked again.
    const polkadotStash = createAccountId('unavailable-polkadot');
    const scope = forkScope();

    const unavailable: UnclaimedPayouts = {
      total: '0',
      payouts: [],
      source: 'unavailable',
      completeness: 'unavailable',
    };
    await seedScan(scope, request(POLKADOT_AH, polkadotStash), unavailable);

    const positions = [position(POLKADOT_AH, polkadotStash)];
    const { result } = renderHook(() => useUnclaimedPayoutsByPosition(positions), { wrapper: wrapperFor(scope) });
    expect(result.current.byPosition[unclaimedKey(POLKADOT_AH, polkadotStash)]).toEqual(unavailable);

    scan.mockClear();
    scan.mockResolvedValue(COMPLETE);
    await act(() => result.current.retry());

    expect(scan).toHaveBeenCalledTimes(1);
    expect(result.current.byPosition[unclaimedKey(POLKADOT_AH, polkadotStash)]).toEqual(COMPLETE);
  });
});
