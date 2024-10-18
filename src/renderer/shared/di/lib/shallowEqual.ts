const hasOwnProperty = Object.prototype.hasOwnProperty;

/**
 * Performs equality by iterating through keys on an object and returning false
 * when any key has values which are not strictly equal between the arguments.
 * Returns true when the values of all keys are strictly equal.
 */
export const shallowEqual = (objA: unknown, objB: unknown): boolean => {
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
};
