import type { KeysOfType } from '../../core/types/utility';

/**
 * Get new array with item inserted at given position
 * @param collection array of items
 * @param item value to be inserted
 * @param position at which position
 * @return {Array}
 */
export function splice<T extends any>(collection: T[], item: T, position: number): T[] {
  return collection.slice(0, position).concat(item, collection.slice(position + 1));
}

/**
 * Create dictionary with given key and value
 * Keys can only be type of string, number or symbol
 * @param collection array of items
 * @param property field to be used as key
 * @param predicate transformer function
 * @return {Object}
 */
export function dictionary<T extends Record<K, PropertyKey>, K extends KeysOfType<T, PropertyKey>>(
  collection: T[],
  property: K,
  predicate?: (item: T) => any,
): Record<T[K], any> {
  return collection.reduce((acc, item) => {
    const element = item[property];

    if (predicate) {
      acc[element] = predicate(item);
    } else {
      acc[element] = item;
    }

    return acc;
  }, {} as Record<T[K], any>);
}

export function getRepeatedIndex(index: number, base: number): number {
  return Math.floor(index / base);
}

export function addUnique<T extends any>(collection: T[], item: T): T[] {
  return collection.includes(item) ? [...collection] : [...collection, item];
}

export function removeFromCollection<T extends any>(collection: T[], item: T): T[] {
  return collection.filter((i) => i !== item);
}

export const sortByDateDesc = <T>([dateA]: [string, T[]], [dateB]: [string, T[]]): number =>
  new Date(dateA) < new Date(dateB) ? 1 : -1;

export const sortByDateAsc = <T>([dateA]: [string, T[]], [dateB]: [string, T[]]): number =>
  new Date(dateA) > new Date(dateB) ? 1 : -1;
