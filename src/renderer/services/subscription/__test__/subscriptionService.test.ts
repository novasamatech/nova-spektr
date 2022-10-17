import { renderHook } from '@testing-library/react';

import { useSubscription } from '../subscriptionService';

describe('service/subscription/subscriptionService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should subscribe and unsubscribe with callback', async () => {
    const {
      result: {
        current: { subscribe, unsubscribe, hasSubscription },
      },
    } = renderHook(() => useSubscription());

    const spyUnsubscribe = jest.fn();
    const unsubscribePromise = Promise.resolve(spyUnsubscribe());
    const chainId = '0x00';

    subscribe(chainId, unsubscribePromise);
    expect(hasSubscription(chainId)).toBeTruthy();

    await unsubscribe(chainId);

    expect(spyUnsubscribe).toBeCalled();
    expect(hasSubscription(chainId)).toBeFalsy();
  });
});
