import { type ApiPromise } from '@polkadot/api';
import { BN_MILLION } from '@polkadot/util';
import { act, renderHook, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

import { DEFAULT_QR_LIFETIME } from '@/shared/lib/utils';
import { useCountdown } from '../useCountdown';

vi.mock('@/shared/lib/utils', () => ({
  getExpectedBlockTime: jest.fn().mockReturnValue(BN_MILLION.muln(2)),
  DEFAULT_QR_LIFETIME: 64,
}));

describe('hooks/useToggle', () => {
  test('should have default countdown', () => {
    const { result } = renderHook(() => useCountdown());

    const [countdown] = result.current;
    expect(countdown).toEqual(DEFAULT_QR_LIFETIME);
  });

  test('should change countdown value', () => {
    const { result } = renderHook(() => useCountdown([{} as ApiPromise]));

    const [countdown, resetCountdown] = result.current;
    expect(countdown).toEqual(DEFAULT_QR_LIFETIME);

    act(() => resetCountdown());
    waitFor(() => {
      expect(countdown).toEqual(128000);
    });
  });
});
