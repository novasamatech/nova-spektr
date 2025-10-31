export const enum DerivationError {
  EMPTY = 1,
  HAS_SPACES,
  TRIM_SPACES,
  PASSWORD_NOT_SUPPORTED,
  MUST_START_WITH_SLASH,
  ENDS_WITH_SLASH,
  DUPLICATE,
  ETHEREUM_SINGLE_SLASH,
}

type ValidateDerivationOptions = { otherPaths?: string[]; isEthereum?: boolean };

/**
 * Validate derivation path
 *
 * @param path Derivation path to validate
 * @param options Validation options
 * @param options.otherPaths Optional array of other paths to detect duplicates
 * @param options.isEthereum Whether to validate as an Ethereum derivation path
 *
 * @returns {DerivationError[]} Array of errors. Empty if valid
 */
export function validateDerivation(path: string, options?: ValidateDerivationOptions): DerivationError[] {
  const errors: DerivationError[] = [];

  if (!path) return [DerivationError.EMPTY];

  if (path.trim() !== path) {
    errors.push(DerivationError.TRIM_SPACES);
  }

  const trimmed = path.trim();

  if (/\s/.test(trimmed)) {
    errors.push(DerivationError.HAS_SPACES);
  }

  if (!trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    errors.push(DerivationError.MUST_START_WITH_SLASH);
  }

  if (trimmed.endsWith('/')) {
    errors.push(DerivationError.ENDS_WITH_SLASH);
  }

  if (derivationHasPassword(trimmed)) {
    errors.push(DerivationError.PASSWORD_NOT_SUPPORTED);
  }

  if (options?.otherPaths && options.otherPaths.includes(trimmed)) {
    errors.push(DerivationError.DUPLICATE);
  }

  if (options?.isEthereum && /(?<!\/)\/(?!\/)/.test(trimmed)) {
    errors.push(DerivationError.ETHEREUM_SINGLE_SLASH);
  }

  return errors;
}

/**
 * Validate that derivation path has password
 *
 * @param path Derivation path
 *
 * @returns {Boolean}
 */
export function derivationHasPassword(path: string): boolean {
  return /\/\/\//g.test(path);
}
