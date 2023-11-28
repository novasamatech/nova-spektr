/**
 * Validate derivation path
 * @param value derivation path
 * @return {Boolean}
 */
export function validateDerivation(value: string): boolean {
  return !derivationHasPassword(value) && /^(\/\/|\/).+[^/]$/g.test(value);
}

/**
 * Validate that derivation path has password
 * @param value derivation path
 * @return {Boolean}
 */
export function derivationHasPassword(value: string): boolean {
  return /\/\/\//g.test(value);
}
