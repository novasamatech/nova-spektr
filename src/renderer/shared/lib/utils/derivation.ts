/**
 * Validate derivation path
 * @param value derivation path
 * @return {Boolean}
 */
export function validateDerivation(value: string): boolean {
  return /^(\/\/|\/)[^/].+[^/]$/g.test(value);
}
