import { act, renderHook } from '@testing-library/react';
import { type Scope, allSettled, fork } from 'effector';
import { Provider, useUnit } from 'effector-react';
import { type PropsWithChildren } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { type ChainId } from '@/shared/core';
import type * as StakingDomain from '@/domains/staking';
import { type NetworkAvgRate } from '@/domains/staking';
import { useNetworkApys } from '../useNetworkApys';
import { useNetworkAvgRates } from '../useNetworkAvgRates';

import { $apyCache, $avgRateCache, $eraCache } from './domainMocks';

vi.mock('@/domains/staking', async (importOriginal) => {
  const actual = await importOriginal<typeof StakingDomain>();
  const { $apyCache, $avgRateCache } = await import('./domainMocks');

  return {
    ...actual,
    apy: {
      apyResource: { ...actual.apy.apyResource, $cache: $apyCache },
      networkAvgRateResource: { ...actual.apy.networkAvgRateResource, $cache: $avgRateCache },
    },
  };
});

vi.mock('../useChainEras', async () => {
  const { $eraCache } = await import('./domainMocks');

  return { useChainEras: () => useUnit($eraCache) };
});

vi.mock('../useResourcePool', () => ({ useResourcePool: () => undefined }));

const CHAIN = `0x${'1'.padStart(64, '0')}` as ChainId;
const ERA = 100;
const NEXT_ERA = 101;

const RATE: NetworkAvgRate = { ratePercent: '14.20', fromEra: 70, toEra: 99, days: 30 };
const NEXT_RATE: NetworkAvgRate = { ratePercent: '14.10', fromEra: 71, toEra: 100, days: 30 };

const wrapperFor = (scope: Scope) => {
  const Wrapper = ({ children }: PropsWithChildren) => <Provider value={scope}>{children}</Provider>;

  return Wrapper;
};

const forkAtEra = () =>
  fork({
    values: [
      [$eraCache, { [CHAIN]: ERA }],
      [$apyCache, { [CHAIN]: { era: ERA, value: '15.5' } }],
      [$avgRateCache, { [CHAIN]: { era: ERA, value: RATE } }],
    ],
  });

describe('network rates across an era rollover', () => {
  it('serves the values cached for the active era', () => {
    const scope = forkAtEra();
    const wrapper = wrapperFor(scope);

    expect(renderHook(() => useNetworkApys([CHAIN]), { wrapper }).result.current).toEqual({ [CHAIN]: 15.5 });
    expect(renderHook(() => useNetworkAvgRates([CHAIN]), { wrapper }).result.current).toEqual({ [CHAIN]: RATE });
  });

  it('reads as unknown after the era moves on, until the new era answers', async () => {
    const scope = forkAtEra();
    const wrapper = wrapperFor(scope);
    const apys = renderHook(() => useNetworkApys([CHAIN]), { wrapper });
    const rates = renderHook(() => useNetworkAvgRates([CHAIN]), { wrapper });

    await act(() => allSettled($eraCache, { scope, params: { [CHAIN]: NEXT_ERA } }));

    expect(apys.result.current).toEqual({ [CHAIN]: null });
    expect(rates.result.current).toEqual({ [CHAIN]: null });

    await act(async () => {
      await allSettled($apyCache, { scope, params: { [CHAIN]: { era: NEXT_ERA, value: '15.1' } } });
      await allSettled($avgRateCache, { scope, params: { [CHAIN]: { era: NEXT_ERA, value: NEXT_RATE } } });
    });

    expect(apys.result.current).toEqual({ [CHAIN]: 15.1 });
    expect(rates.result.current).toEqual({ [CHAIN]: NEXT_RATE });
  });
});
