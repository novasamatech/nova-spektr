// =====================================================
// ============ IStakingService interface ==============
// =====================================================

export type ISubscriptionService<T extends string = string> = {
  hasSubscription: (key: T) => boolean;
  subscribe: (key: T, unsubscribe: Promise<any>) => void;
  unsubscribe: (key: T) => Promise<void>;
  unsubscribeAll: () => Promise<void>;
};

// =====================================================
// ===================== General =======================
// =====================================================

export type SubsType<K extends string> = Record<K, Promise<any>[]>;
