import { createEvent, createStore } from 'effector';
import { persist } from 'effector-storage/local';

export const tokenAdded = createEvent<string>();
export const tokenRemoved = createEvent<string>();

export const $trackedPriceIds = createStore<string[]>(['polkadot', 'kusama']);

persist({ key: 'dashboard_tracked_price_ids', store: $trackedPriceIds, sync: true });

$trackedPriceIds
  .on(tokenAdded, (ids, priceId) => (ids.includes(priceId) ? ids : [...ids, priceId]))
  .on(tokenRemoved, (ids, priceId) => ids.filter((id) => id !== priceId));
