import { ChainId } from '@renderer/domain/shared-kernel';

export type ISubscriptionService = {
  hasSubscription: (chainId: ChainId) => boolean;
  subscribe: (chainId: ChainId, unsubscribe: Promise<any>) => void;
  unsubscribe: (chainId: ChainId) => Promise<void>;
  unsubscribeAll: () => Promise<void>;
};
