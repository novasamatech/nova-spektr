import { type ChainId } from '@/shared/core';

import { type CollectivePalletsType, type CollectivesStruct } from './types';

export const combineStores = <const T extends Record<string, CollectivesStruct<unknown>>>(fields: T) => {
  type CombinedValue = Partial<{
    [K in keyof T]: T[K] extends CollectivesStruct<infer I> ? I : never;
  }>;
  type CombinedStore = Partial<Record<CollectivePalletsType, Record<ChainId, CombinedValue>>>;

  const store: CombinedStore = {};
  for (const [fieldName, fieldStore] of Object.entries(fields)) {
    for (const [palletType, chainStore] of Object.entries(fieldStore)) {
      let palletStore = store[palletType as CollectivePalletsType];
      if (!palletStore) {
        palletStore = {};
        store[palletType as CollectivePalletsType] = palletStore;
      }

      for (const [chainId, value] of Object.entries(chainStore)) {
        let chainStore = palletStore[chainId as ChainId];
        if (!chainStore) {
          chainStore = {};
          palletStore[chainId as ChainId] = chainStore;
        }

        // @ts-expect-error Dynamic value
        chainStore[fieldName] = value;
      }
    }
  }

  return store;
};
