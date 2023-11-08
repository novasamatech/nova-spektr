import { useRef } from 'react';

import { ISubscriptionService, SubsType, UnsubscribeType } from './common/types';

export const useSubscription = <T extends string>(): ISubscriptionService<T> => {
  const subscriptions = useRef<SubsType<T>>({} as SubsType<T>);

  const subscribe = (key: T, unsubscribe: UnsubscribeType | UnsubscribeType[]): void => {
    if (Array.isArray(unsubscribe)) {
      subscriptions.current[key]
        ? subscriptions.current[key].push(...unsubscribe)
        : (subscriptions.current[key] = unsubscribe);
    } else {
      subscriptions.current[key]
        ? subscriptions.current[key].push(unsubscribe)
        : (subscriptions.current[key] = [unsubscribe]);
    }
  };

  const unsubscribe = (key: T) => {
    if (!subscriptions.current[key]) return;

    const promises = subscriptions.current[key].reduce<Promise<any>[]>((acc, fn) => {
      if (fn instanceof Promise) {
        acc.push(fn);
      } else {
        fn();
      }

      return acc;
    }, []);

    Promise.all(promises).then(() => {
      const { [key]: _, ...newSubscriptions } = subscriptions.current;
      subscriptions.current = newSubscriptions as SubsType<T>;
    });
  };

  const unsubscribeAll = () => {
    const unsubs = Object.values(subscriptions.current).flat() as UnsubscribeType[];

    const promises = unsubs.reduce<Promise<any>[]>((acc, fn) => {
      if (fn instanceof Promise) {
        acc.push(fn);
      } else {
        fn();
      }

      return acc;
    }, []);

    Promise.all(promises).then(() => {
      subscriptions.current = {} as SubsType<T>;
    });
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
