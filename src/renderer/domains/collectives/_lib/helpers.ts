import { type ChainId } from '@/shared/core';
import { entries, groupBy, isEqual, merge, nullable, pickNestedValue, setNestedValue } from '@/shared/lib/utils';

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

export const mergeNested = <
  Store extends CollectivesStruct<Item[]>,
  Item extends { pallet: CollectivePalletsType; chainId: ChainId },
>(
  store: Store,
  records: Item[],
  mergeBy: (a: Item) => PropertyKey | PropertyKey[],
  sort?: (a: Item, b: Item) => number,
): Store => {
  const palletGroups = groupBy(records, m => m.pallet);
  let next = store;
  for (const [pallet, palletItems] of entries(palletGroups)) {
    if (nullable(palletItems)) continue;
    const chainItems = groupBy(palletItems, m => m.chainId);
    for (const [chainId, items] of entries(chainItems)) {
      const prev = pickNestedValue(store, pallet, chainId);
      const merged = merge({
        a: prev ?? [],
        b: items ?? [],
        mergeBy,
        filter: (a, b) => !isEqual(a, b),
        sort,
      });

      // @ts-expect-error weird type error
      next = setNestedValue(next, pallet, chainId, merged);
    }
  }

  return next;
};
