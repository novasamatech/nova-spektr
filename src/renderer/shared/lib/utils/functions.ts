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
 * Type guard that checks is value nullable
 *
 * @param value Value to be checked
 *
 * @returns {Boolean}
 */
export function nullable(value: unknown): value is null | undefined {
  return value === null || value === undefined;
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

const hasOwnProperty = Object.prototype.hasOwnProperty;

/**
 * Performs equality by iterating through keys on an object and returning false
 * when any key has values which are not strictly equal between the arguments.
 * Returns true when the values of all keys are strictly equal.
 */
export function shallowEqual(objA: unknown, objB: unknown): boolean {
  if (Object.is(objA, objB)) {
    return true;
  }

  if (Array.isArray(objA) && Array.isArray(objB)) {
    if (objA.length !== objB.length) {
      return false;
    }

    for (let i = 0; i < objA.length; i++) {
      if (!Object.is(objA[i], objB[i])) {
        return false;
      }
    }

    return true;
  }

  if (typeof objA !== 'object' || objA === null || typeof objB !== 'object' || objB === null) {
    return false;
  }

  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) {
    return false;
  }

  // Test for A's keys different from B.
  for (let i = 0; i < keysA.length; i++) {
    const keyA = keysA[i];
    if (
      !keyA ||
      !hasOwnProperty.call(objB, keyA) ||
      !Object.is((objA as Record<string, unknown>)[keyA], (objB as Record<string, unknown>)[keyA])
    ) {
      return false;
    }
  }

  return true;
}
