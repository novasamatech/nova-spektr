import { act, renderHook, waitFor } from '@testing-library/react';

import { useCountdown } from '../useCountdown';

describe('hooks/useCountdown', () => {
  test('should start with countdown at null', () => {
    const { result } = renderHook(() => useCountdown());

    const [countdown] = result.current;
    expect(countdown).toBeNull();
  });

  test('should set countdown via resetCountdown', () => {
    const { result } = renderHook(() => useCountdown());

    act(() => {
      const [, resetCountdown] = result.current;
      resetCountdown(120);
    });

    waitFor(() => {
      const [countdown] = result.current;
      expect(countdown).toEqual(120);
    });
  });
});
