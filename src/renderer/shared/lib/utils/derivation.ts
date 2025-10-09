export const enum DerivationError {
  EMPTY = 1,
  HAS_SPACES,
  TRIM_SPACES,
  PASSWORD_NOT_SUPPORTED,
  MUST_START_WITH_SLASH,
  ENDS_WITH_SLASH,
  DUPLICATE,
}

/**
 * Validate derivation path
 *
 * @param value Derivation path
 * @param existingPaths Optional array of existing paths to detect duplicates
 *
 * @returns {DerivationError[]} Array of errors. Empty if valid
 */
export function validateDerivation(value: string, existingPaths?: string[]): DerivationError[] {
  const errors: DerivationError[] = [];

  if (!value) return [DerivationError.EMPTY];

  if (value.trim() !== value) {
    errors.push(DerivationError.TRIM_SPACES);
  }

  const trimmed = value.trim();

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

  if (existingPaths && existingPaths.includes(trimmed)) {
    errors.push(DerivationError.DUPLICATE);
  }

  return errors;
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
