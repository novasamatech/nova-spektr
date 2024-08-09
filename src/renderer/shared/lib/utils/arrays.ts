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
 * Create dictionary with given key and value Keys can only
 * be type of string, number or symbol
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

export function removeFromCollection<T>(collection: T[], item: T): T[] {
  return collection.filter((i) => i !== item);
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
