import { renderHook, act, waitFor } from '@testing-library/react';
import { BN_MILLION } from '@polkadot/util';
import { ApiPromise } from '@polkadot/api';

import { DEFAULT_QR_LIFETIME } from '@renderer/shared/lib/utils';
import { useCountdown } from '../useCountdown';

jest.mock('@renderer/shared/utils/substrate', () => ({
  getExpectedBlockTime: jest.fn().mockReturnValue(BN_MILLION.muln(2)),
}));

describe('hooks/useToggle', () => {
  test('should have default countdown', () => {
    const { result } = renderHook(() => useCountdown());

    const [countdown] = result.current;
    expect(countdown).toEqual(DEFAULT_QR_LIFETIME);
  });

  test('should change countdown value', () => {
    const { result } = renderHook(() => useCountdown({} as ApiPromise));

    const [countdown, resetCountdown] = result.current;
    expect(countdown).toEqual(DEFAULT_QR_LIFETIME);

    act(() => resetCountdown());
    waitFor(() => {
      expect(countdown).toEqual(128000);
    });
  });
});
