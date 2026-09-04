import { BN } from '@polkadot/util';
import { describe, expect, it } from 'vitest';

import { formatToken, isDustToken } from './formatToken';

const DOT_PRECISION = 10;

describe('formatToken', () => {
  it('prints a readable amount with its symbol', () => {
    expect(formatToken(new BN('12500000000'), DOT_PRECISION, 'DOT')).toBe('1.25 DOT');
  });

  it('keeps the magnitude suffix once', () => {
    expect(formatToken(new BN('89000000000000000'), DOT_PRECISION, 'DOT')).toBe('8.9M DOT');
  });

  it('labels a single-planck lock as dust instead of a ten-digit tail', () => {
    expect(formatToken(new BN(1), DOT_PRECISION, 'DOT')).toBe('<0.0001 DOT');
    expect(isDustToken(new BN(1), DOT_PRECISION)).toBe(true);
  });

  it('does not call zero or a readable amount dust', () => {
    expect(isDustToken(new BN(0), DOT_PRECISION)).toBe(false);
    expect(isDustToken(new BN('999999'), DOT_PRECISION)).toBe(true);
    expect(isDustToken(new BN('1000000'), DOT_PRECISION)).toBe(false); // 0.0001 DOT is the first readable step
    expect(formatToken(new BN(0), DOT_PRECISION, 'DOT')).toBe('0 DOT');
  });
});
