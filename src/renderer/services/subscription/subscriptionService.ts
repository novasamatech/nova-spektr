import { useRef } from 'react';

import { ISubscriptionService, SubsType } from './common/types';

export const useSubscription = <T extends string>(): ISubscriptionService<T> => {
  const subscriptions = useRef<SubsType<T>>({} as SubsType<T>);

  const subscribe = (chainId: T, unsubscribe: Promise<any>): void => {
    subscriptions.current[chainId]
      ? subscriptions.current[chainId].push(unsubscribe)
      : (subscriptions.current[chainId] = [unsubscribe]);
  };

  const unsubscribe = async (key: T): Promise<void> => {
    if (!subscriptions.current[key]) return;
    await Promise.all(subscriptions.current[key]);

    const { [key]: _, ...newSubscriptions } = subscriptions.current;
    subscriptions.current = newSubscriptions as SubsType<T>;
  };

  const unsubscribeAll = async (): Promise<void> => {
    await Promise.all(Object.values(subscriptions.current).flat());

    subscriptions.current = {} as SubsType<T>;
  };

  const hasSubscription = (key: T): boolean => {
    return Boolean(subscriptions.current[key]);
  };

  return {
    subscribe,
    hasSubscription,
    unsubscribe,
    unsubscribeAll,
  };
};
