/**
 * Type guard that checks is value non-nullable
 *
 * @param value Value to be checked
 *
 * @returns {Boolean}
 */
export function nonNullable<T>(value: T): value is Exclude<NonNullable<T>, void> {
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

type NonNullableMap<T extends Record<PropertyKey, unknown>> = {
  [K in keyof T]: NonNullable<T[K]>;
};

/**
 * Type guard that checks every value in record. If any field is null or
 * undefined - returns false.
 */
export function nonNullableMap<T extends Record<PropertyKey, unknown>>(values: T): values is NonNullableMap<T> {
  for (const item of Object.values(values)) {
    if (nullable(item)) {
      return false;
    }
  }
  return true;
}

/**
 * Oposite of nonNullableMap, but it doesn't work as type guard, simple runtime
 * check
 */
export function nullableMap<T extends Record<PropertyKey, unknown>>(values: T): boolean {
  for (const item of Object.values(values)) {
    if (nullable(item)) {
      return true;
    }
  }
  return false;
}

/**
 * Type guard that checks is value nullable
 *
 * @param value Value to be checked
 *
 * @returns {Boolean}
 */
export function assert<T>(value: unknown, message?: string): asserts value is NonNullable<T> {
  if (value === null || value === undefined) {
    throw new Error(message ?? 'Value is nullish');
  }
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

export const jitter = (value: number, offsetRange: number) => {
  return value + (Math.random() * (offsetRange * 2) - offsetRange);
};

export type PromiseWithResolvers<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
};

export const promiseWithResolvers = <T>(): PromiseWithResolvers<T> => {
  let resolve: (value: T) => void;
  let reject: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  // @ts-expect-error before assign
  return { promise, resolve, reject };
};

export function delay(ttl: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ttl));
}

export function withTimeout<T>(promise: Promise<T>, ttl: number, fallback: T): Promise<T> {
  return Promise.race([promise, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ttl))]);
}
