export enum TokenType {
  SOFT = 'soft',
  HARD = 'hard',
  PASSWORD = 'password',
  SEGMENT = 'segment',
  SHARD_RANGE = 'shard_range',
}

export interface Token {
  type: TokenType;
  value: string;
  start: number;
  end: number;
}

export interface ParsedDerivation {
  tokens: Token[];
  raw: string;
  shardCount?: number;
}

export function parseDerivation(path: string): ParsedDerivation {
  const tokens: Token[] = [];
  let shardCount: number | undefined;

  if (!path) {
    return {
      tokens: [],
      raw: path,
    };
  }

  let i = 0;
  const len = path.length;

  while (i < len) {
    if (i + 2 < len && path[i] === '/' && path[i + 1] === '/' && path[i + 2] === '/') {
      tokens.push({
        type: TokenType.PASSWORD,
        value: '///',
        start: i,
        end: i + 3,
      });
      i += 3;
      continue;
    }

    if (i + 1 < len && path[i] === '/' && path[i + 1] === '/') {
      tokens.push({
        type: TokenType.HARD,
        value: '//',
        start: i,
        end: i + 2,
      });
      i += 2;
      continue;
    }

    // Check for soft derivation /
    if (path[i] === '/') {
      tokens.push({
        type: TokenType.SOFT,
        value: '/',
        start: i,
        end: i + 1,
      });
      i += 1;
      continue;
    }

    const start = i;
    let segment = '';

    while (i < len && path[i] !== '/') {
      segment += path[i];
      i++;
    }

    if (segment) {
      const shardMatch = segment.match(/^0\.\.\.(\d+)$/);

      if (shardMatch) {
        const count = parseInt(shardMatch[1], 10);

        tokens.push({
          type: TokenType.SHARD_RANGE,
          value: segment,
          start,
          end: i,
        });

        shardCount = count;
      } else {
        tokens.push({
          type: TokenType.SEGMENT,
          value: segment,
          start,
          end: i,
        });
      }
    }
  }

  return {
    tokens,
    raw: path,
    shardCount,
  };
}

export enum DerivationError {
  EMPTY = 'EMPTY',
  TRIM_SPACES = 'TRIM_SPACES',
  HAS_SPACES = 'HAS_SPACES',
  MUST_START_WITH_SLASH = 'MUST_START_WITH_SLASH',
  ENDS_WITH_SLASH = 'ENDS_WITH_SLASH',
  INVALID_STRUCTURE = 'INVALID_STRUCTURE',
  ETHEREUM_SINGLE_SLASH = 'ETHEREUM_SINGLE_SLASH',
  DUPLICATE = 'DUPLICATE',
  INVALID_SHARD_RANGE = 'INVALID_SHARD_RANGE',
  EMPTY_SEGMENT = 'EMPTY_SEGMENT',
  PASSWORD_NOT_SUPPORTED = 'PASSWORD_NOT_SUPPORTED',
}

export interface ValidationOptions {
  isEthereumBased?: boolean;
  otherPaths?: string[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: DerivationError[];
  parsed: ParsedDerivation;
}

export function validateDerivation(path: string, options?: ValidationOptions): ValidationResult {
  const errors: DerivationError[] = [];

  if (!path) {
    return {
      isValid: false,
      errors: [DerivationError.EMPTY],
      parsed: { tokens: [], raw: path },
    };
  }

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

  const parsed = parseDerivation(trimmed);

  const hasPassword = parsed.tokens.some((t) => t.type === TokenType.PASSWORD);
  if (hasPassword) {
    errors.push(DerivationError.PASSWORD_NOT_SUPPORTED);
  }

  // Token structure validation: must alternate separator -> segment -> separator -> segment
  if (parsed.tokens.length > 0) {
    let expectingSeparator = true;

    for (const token of parsed.tokens) {
      const isSeparator = token.type === TokenType.SOFT || token.type === TokenType.HARD;

      if (expectingSeparator && !isSeparator) {
        errors.push(DerivationError.INVALID_STRUCTURE);
        break;
      } else if (!expectingSeparator && isSeparator) {
        errors.push(DerivationError.INVALID_STRUCTURE);
        break;
      }

      expectingSeparator = !expectingSeparator;
    }

    // Check for empty segments
    for (let i = 0; i < parsed.tokens.length - 1; i++) {
      const current = parsed.tokens[i];
      const next = parsed.tokens[i + 1];

      const currentIsSeparator = current.type === TokenType.SOFT || current.type === TokenType.HARD;
      const nextIsSeparator = next.type === TokenType.SOFT || next.type === TokenType.HARD;
      if (currentIsSeparator && nextIsSeparator) {
        errors.push(DerivationError.EMPTY_SEGMENT);
        break;
      }
    }
  }

  // Ethereum-specific validation
  if (options?.isEthereumBased) {
    const hasSoftDerivation = parsed.tokens.some((t) => t.type === TokenType.SOFT);
    if (hasSoftDerivation) {
      errors.push(DerivationError.ETHEREUM_SINGLE_SLASH);
    }
  }

  // Shard range validation
  if (parsed.shardCount !== undefined && parsed.shardCount < 2) {
    errors.push(DerivationError.INVALID_SHARD_RANGE);
  }

  // Duplicate check
  if (options?.otherPaths && options.otherPaths.includes(trimmed)) {
    errors.push(DerivationError.DUPLICATE);
  }

  return {
    isValid: errors.length === 0,
    errors,
    parsed,
  };
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
