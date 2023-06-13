import { act, renderHook } from '@testing-library/react';

import { useToggle } from '../useToggle';

describe('hooks/useToggle', () => {
  test('should change value on toggle', () => {
    const { result } = renderHook(() => useToggle());

    const [_, toggle] = result.current;
    expect(result.current[0]).toEqual(false);
    act(() => toggle());
    expect(result.current[0]).toEqual(true);
  });
});
