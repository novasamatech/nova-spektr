import {
  formatAxisValue,
  formatEraNumber,
  formatEraValue,
  formatExactTokens,
  formatSignedPercent,
  formatSignedTokens,
  planckToTokens,
} from '../format';

describe('planckToTokens', () => {
  test('should shift by the asset precision', () => {
    expect(planckToTokens('11499830000000000', 10)).toBe(1_149_983);
    expect(planckToTokens('4500000000000000', 12)).toBe(4_500);
  });
});

describe('formatEraValue', () => {
  test('should keep the K-notation precision floor that tells flat eras apart', () => {
    // formatBalance's M-shorthand would print the same "1.15M" for both.
    expect(formatEraValue(1_150_003)).toBe('1,150.0K');
    expect(formatEraValue(1_156_249)).toBe('1,156.2K');
  });

  test('should not print sub-thousand values as fractions of a K', () => {
    expect(formatEraValue(4_512)).toBe('4,512');
  });
});

describe('formatExactTokens', () => {
  test('should print full precision with grouping', () => {
    expect(formatExactTokens(1_149_983)).toBe('1,149,983');
  });
});

describe('formatSignedTokens', () => {
  test('should sign both directions', () => {
    expect(formatSignedTokens(10_251)).toBe('+10,251');
    expect(formatSignedTokens(-6_246)).toBe('−6,246');
  });
});

describe('formatSignedPercent', () => {
  test('should compute the change against the base', () => {
    expect(formatSignedPercent(1_152_410, 1_150_003)).toBe('+0.21%');
    expect(formatSignedPercent(1_149_977, 1_160_234)).toBe('−0.88%');
  });
});

describe('formatAxisValue', () => {
  test('should follow the grid step precision for millions', () => {
    expect(formatAxisValue(1_200_000, 100_000)).toBe('1.2M');
    expect(formatAxisValue(1_155_000, 5_000)).toBe('1.155M');
  });

  test('should use K below a million and integers below ten thousand', () => {
    expect(formatAxisValue(450_000, 50_000)).toBe('450K');
    expect(formatAxisValue(4_500, 500)).toBe('4,500');
  });
});

describe('formatEraNumber', () => {
  test('should group thousands', () => {
    expect(formatEraNumber(2260)).toBe('2,260');
    expect(formatEraNumber(9897)).toBe('9,897');
  });
});
