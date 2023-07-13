import { renderHook, act, waitFor } from '@testing-library/react';

import { useTaskQueue } from '../useTaskQueue';

describe('hooks/useTaskQueue', () => {
  test('should add new task', () => {
    const { result } = renderHook(() => useTaskQueue());
    const { tasks, addTask } = result.current;

    expect(tasks.length).toEqual(0);

    const fn = jest.fn();

    act(() => addTask(fn));
    waitFor(() => {
      expect(fn).toHaveBeenCalled();
    });
  });

  test('should add 2 tasks', () => {
    const { result } = renderHook(() => useTaskQueue());
    const { addTask } = result.current;

    const fn = jest.fn();

    act(() => {
      addTask(fn);
      addTask(fn);
    });

    waitFor(() => {
      expect(fn).toHaveBeenCalledTimes(1);
    });

    expect(result.current.tasks.length).toBe(1);

    act(() => addTask(fn));

    waitFor(() => {
      expect(fn).toHaveBeenCalledTimes(3);
    });
  });
});
