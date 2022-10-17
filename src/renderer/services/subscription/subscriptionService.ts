import { useRef } from 'react';

import { ISubscriptionService } from './common/types';
import { ChainId } from '@renderer/domain/shared-kernel';

export const useSubscription = (): ISubscriptionService => {
  const subscriptions = useRef<Record<ChainId, Promise<any>[]>>({});

  const subscribe = (chainId: ChainId, unsubscribe: Promise<any>): void => {
    subscriptions.current[chainId]
      ? subscriptions.current[chainId].push(unsubscribe)
      : (subscriptions.current[chainId] = [unsubscribe]);
  };

  const unsubscribe = async (chainId: ChainId): Promise<void> => {
    if (!subscriptions.current[chainId]) return;
    await Promise.all(subscriptions.current[chainId]);

    const { [chainId]: _, ...newSubscriptions } = subscriptions.current;
    subscriptions.current = newSubscriptions;
  };

  const unsubscribeAll = async (): Promise<void> => {
    await Promise.all(Object.values(subscriptions.current).flat());

    subscriptions.current = {};
  };

  const hasSubscription = (chainId: ChainId): boolean => {
    return !!subscriptions.current[chainId];
  };

  return {
    subscribe,
    hasSubscription,
    unsubscribe,
    unsubscribeAll,
  };
};
