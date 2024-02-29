import { renderHook, waitFor } from '@testing-library/react';

import { useSubscription } from '../subscriptionService';

describe('service/subscription/subscriptionService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should return methods', async () => {
    const {
      result: {
        current: { subscribe, unsubscribe, hasSubscription, unsubscribeAll },
      },
    } = renderHook(() => useSubscription());

    expect(subscribe).toBeDefined();
    expect(unsubscribe).toBeDefined();
    expect(hasSubscription).toBeDefined();
    expect(unsubscribeAll).toBeDefined();
  });

  test('should subscribe and unsubscribe with callback', async () => {
    const {
      result: {
        current: { subscribe, unsubscribe, hasSubscription },
      },
    } = renderHook(() => useSubscription());

    const spyUnsubscribe = jest.fn();
    const unsubscribePromise = Promise.resolve(spyUnsubscribe());
    const key = '0x00';

    subscribe(key, unsubscribePromise);
    expect(hasSubscription(key)).toBeDefined();

    unsubscribe(key);

    expect(spyUnsubscribe).toBeCalled();
    await waitFor(() => {
      expect(hasSubscription(key)).toEqual(false);
    });
  });

  test('should unsubscribe all', async () => {
    const {
      result: {
        current: { subscribe, hasSubscription, unsubscribeAll },
      },
    } = renderHook(() => useSubscription());

    const spyUnsubscribe = jest.fn();
    const keys = ['0x00', '0x01', '0x02'];

    keys.forEach((key) => {
      const unsubscribePromise = Promise.resolve(spyUnsubscribe());
      subscribe(key, unsubscribePromise);
      expect(hasSubscription(key)).toBeDefined();
    });

    unsubscribeAll();

    expect(spyUnsubscribe).toBeCalledTimes(3);
    await waitFor(() => {
      keys.forEach((key) => {
        expect(hasSubscription(key)).toEqual(false);
      });
    });
  });
});
