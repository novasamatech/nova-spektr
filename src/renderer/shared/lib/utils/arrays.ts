/**
 * Get new array with item inserted at given position
 * @param collection array of items
 * @param item value to be inserted
 * @param position at which position
 * @return {Array}
 */
export function splice<T extends any>(collection: T[], item: T, position: number): T[] {
  return [...collection.slice(0, position), item, ...collection.slice(position + 1)];
}
