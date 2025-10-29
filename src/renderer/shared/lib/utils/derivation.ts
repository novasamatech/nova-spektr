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

const SHARDED_PATH_REGEX = /^(.*\/)(\d+)$/;

/**
 * Groups keys by their sharded derivation base path.
 *
 * @param keys Array of objects containing a `derivationPath` string
 *
 * @returns {Record<string, T[]>} A map of base derivation paths to keys
 */
export function groupShardedDerivations<T extends { derivationPath: string }>(keys: T[]): Record<string, T[]> {
  const basePaths = new Map<string, T[]>();

  for (const key of keys) {
    const match = key.derivationPath.match(SHARDED_PATH_REGEX);
    if (match) {
      const [, basePath] = match;
      if (!basePaths.has(basePath)) {
        basePaths.set(basePath, []);
      }
      basePaths.get(basePath)!.push(key);
    }
  }

  const groups: Record<string, T[]> = {};
  for (const [basePath, keys] of basePaths) {
    if (keys.length > 1) {
      groups[basePath] = keys;
    }
  }

  return groups;
}
