import { isFunction } from 'lodash';

import { type KeysOfType } from '@/shared/core/types/utility';

/**
 * Get new array with item inserted at given position
 *
 * @param collection Array of items
 * @param item Value to be inserted
 * @param position At which position
 *
 * @returns {Array}
 */
export function splice<T>(collection: T[], item: T, position: number): T[] {
  return collection.slice(0, position).concat(item, collection.slice(position + 1));
}

/**
 * Create dictionary with given key and transformer value. Keys can only be type
 * of string, number or symbol
 *
 * @param collection Array of items
 * @param key Property to be used as key
 * @param transformer Transformer function or plain value
 *
 * @returns {Object}
 */
export function dictionary<T extends Record<K, PropertyKey>, K extends KeysOfType<T, PropertyKey>, R = T>(
  collection: T[],
  key: K,
  transformer?: ((item: T) => R) | R,
): Record<T[K], R> {
  const result: Record<T[K], R> = {} as Record<T[K], R>;

  for (const item of collection) {
    const element = item[key];

    if (!element) continue;

    if (!transformer) {
      result[element] = item as unknown as R;
    } else if (typeof transformer === 'function') {
      result[element] = (transformer as (item: T) => R)(item);
    } else {
      result[element] = transformer as R;
    }
  }

  return result;
}

export function getRepeatedIndex(index: number, base: number): number {
  return Math.floor(index / base);
}

export function addUnique<T>(collection: T[], item: T, compareKeyFn: (x: T) => unknown = (x) => x): T[] {
  const valueToCompare = compareKeyFn(item);

  for (let i = 0; i < collection.length; i++) {
    if (compareKeyFn(collection[i]) === valueToCompare) {
      return splice(collection, item, i);
    }
  }

  return [...collection, item];
}

export function addUniqueItems<T>(collection: T[], items: T[]): T[] {
  return items.reduce((acc, item) => addUnique(acc, item), [...collection]);
}

export function removeFromCollection<T>(collection: T[], item: T): T[] {
  return collection.filter((i) => i !== item);
}

export function removeItemsFromCollection<T>(collection: T[], items: T[]): T[] {
  return collection.filter((i) => !items.includes(i));
}

export const sortByDateDesc = <T>([dateA]: [string, T[]], [dateB]: [string, T[]]): number =>
  new Date(dateA) < new Date(dateB) ? 1 : -1;

export const sortByDateAsc = <T>([dateA]: [string, T[]], [dateB]: [string, T[]]): number =>
  new Date(dateA) > new Date(dateB) ? 1 : -1;

export const toKeysRecord = <T extends string[]>(array: T): Record<T[number], true> => {
  const res: Record<string, true> = {};

  for (let i = 0; i < array.length; i++) {
    const item = array[i];
    if (!item) {
      continue;
    }
    res[item] = true;
  }

  return res as Record<T[number], true>;
};

type MergeParams<T> = {
  a: T[];
  b: T[];
  mergeBy: (value: T) => PropertyKey | PropertyKey[];
  merge?: (a: T, b: T) => T;
  sort?: (a: T, b: T) => number;
  filter?: (a: T, b: T) => boolean;
};

const createMergeKey = (key: PropertyKey | PropertyKey[]) => {
  return Array.isArray(key) ? key.join('|') : key;
};

export const merge = <T>({ a, b, mergeBy, merge, sort, filter }: MergeParams<T>) => {
  if (a.length === 0) {
    return b;
  }

  if (b.length === 0) {
    return a;
  }

  const map: Record<PropertyKey, T> = {};

  for (let i = 0; i < a.length; i++) {
    const item = a[i];
    if (!item) {
      continue;
    }

    map[createMergeKey(mergeBy(item))] = item;
  }

  let hadAnyChanges = false;

  for (let i = 0; i < b.length; i++) {
    const item = b[i];
    if (!item) {
      continue;
    }

    const key = createMergeKey(mergeBy(item));

    if (key in map) {
      const prev = map[key];
      if (!filter || filter(prev, item)) {
        hadAnyChanges = true;
        map[key] = merge ? merge(prev, item) : item;
      }
    } else {
      hadAnyChanges = true;
      map[key] = item;
    }
  }

  if (hadAnyChanges) {
    const res = Object.values(map);

    return isFunction(sort) ? res.sort(sort) : res;
  } else {
    return isFunction(sort) ? a.sort(sort) : a;
  }
};

export const groupBy = <const T, const K extends PropertyKey>(
  iterable: Iterable<T>,
  map: (value: NoInfer<T>) => K,
): Record<K, T[]> => {
  const groups: Partial<Record<K, T[]>> = {};

  for (const item of iterable) {
    const itemKey = map(item);

    let list = groups[itemKey];
    if (list === undefined) {
      list = [];
      groups[itemKey] = list;
    }

    list.push(item);
  }

  return groups as Record<K, T[]>;
};

export const entries = <K extends PropertyKey, T>(values: Record<K, T>): [key: K, value: T][] => {
  return Object.entries(values) as [key: K, value: T][];
};
