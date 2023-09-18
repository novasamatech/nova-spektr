/**
 * Type guard that checks is value non-nullable
 * @param value value to be checked
 * @return {Boolean}
 */
export function nonNullable<T>(value: T): value is NonNullable<T> {
  return value !== null && value !== undefined;
}
