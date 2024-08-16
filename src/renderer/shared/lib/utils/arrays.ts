import { isFunction } from 'lodash';

import { type KeysOfType } from '../../core/types/utility';

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
 * Create dictionary with given key and value Keys can only be type of string,
 * number or symbol
 *
 * @param collection Array of items
 * @param property Field to be used as key
 * @param predicate Transformer function
 *
 * @returns {Object}
 */
export function dictionary<T extends Record<K, PropertyKey>, K extends KeysOfType<T, PropertyKey>>(
  collection: T[],
  property: K,
  predicate?: (item: T) => any,
): Record<T[K], any> {
  return collection.reduce(
    (acc, item) => {
      const element = item[property];

      if (predicate) {
        acc[element] = predicate(item);
      } else {
        acc[element] = item;
      }

      return acc;
    },
    {} as Record<T[K], any>,
  );
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

export const merge = <T>(list1: T[], list2: T[], mergeBy: (value: T) => PropertyKey, sort?: (a: T, b: T) => number) => {
  if (list1.length === 0) {
    return list2;
  }

  if (list2.length === 0) {
    return list1;
  }

  const longest = list1.length > list2.length ? list1 : list2;
  const shortest = list1.length > list2.length ? list2 : list1;

  const map: Record<PropertyKey, T> = {};

  for (let i = 0; i < longest.length; i++) {
    const item = longest[i];
    if (!item) {
      continue;
    }

    map[mergeBy(item)] = item;
  }

  for (let i = 0; i < shortest.length; i++) {
    const item = shortest[i];
    if (!item) {
      continue;
    }

    map[mergeBy(item)] = item;
  }

  const res = Object.values(map);

  return isFunction(sort) ? res.sort(sort) : res;
};
