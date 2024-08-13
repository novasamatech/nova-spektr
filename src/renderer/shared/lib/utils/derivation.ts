/**
 * Validate derivation path
 *
 * @param value Derivation path
 *
 * @returns {Boolean}
 */
export function validateDerivation(value: string): boolean {
  return !derivationHasPassword(value) && /^(\/\/|\/).+[^/]$/g.test(value);
}

/**
 * Validate that derivation path has password
 *
 * @param value Derivation path
 *
 * @returns {Boolean}
 */
export function derivationHasPassword(value: string): boolean {
  return /\/\/\//g.test(value);
}
