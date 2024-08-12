/**
 * Type guard that checks is value non-nullable
 *
 * @param value Value to be checked
 *
 * @returns {Boolean}
 */
export function nonNullable<T>(value: T): value is NonNullable<T> {
  return value !== null && value !== undefined;
}

/**
 * Type guard that checks is Promise settled fulfilled
 *
 * @param promise Value of promise to be checked
 *
 * @returns {Boolean}
 */
export function isFulfilled<T>(promise: PromiseSettledResult<T>): promise is PromiseFulfilledResult<T> {
  return promise.status === 'fulfilled';
}

/**
 * Type guard that checks is Promise settled rejected
 *
 * @param promise Value of promise to be checked
 *
 * @returns {Boolean}
 */
export function isRejected<T>(promise: PromiseSettledResult<T>): promise is PromiseRejectedResult {
  return promise.status === 'rejected';
}
