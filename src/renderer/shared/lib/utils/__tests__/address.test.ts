import { type Chain, ChainOptions } from '@/shared/core';
import { isGeneratedAccountName, toAccountId, toAddress, toShortAddress, validateAddress } from '../address';
import { TEST_ACCOUNTS, TEST_ADDRESS } from '../constants';

describe('toAddress', () => {
  test('should convert address to Polkadot', () => {
    const address = toAddress(TEST_ACCOUNTS[0], { prefix: 0 });
    expect(address).toEqual(TEST_ADDRESS);
  });

  test('should convert address to Substrate', () => {
    const address = toAddress(TEST_ACCOUNTS[0]);
    expect(address).toEqual('1ChFWeNRLarAPRCTM3bfJmncJbSAbSS9yqjueWz7jX7iTVZ');
  });

  test('should convert address with default prefix', () => {
    const address = toAddress(TEST_ADDRESS);
    expect(address).toEqual('1ChFWeNRLarAPRCTM3bfJmncJbSAbSS9yqjueWz7jX7iTVZ');
  });

  test('should convert address to specific prefix', () => {
    const address = toAddress(TEST_ADDRESS, { prefix: 0 });
    expect(address).toEqual(TEST_ADDRESS);
  });
});

describe('validateAddress', () => {
  const substrateChain = {} as Chain;
  const evmChain = { options: [ChainOptions.ETHEREUM_BASED] } as Chain;

  test('should fail validation for short address', () => {
    const result = validateAddress('0x00', substrateChain);
    expect(result).toEqual(false);
  });

  test('should fail validation for invalid public key', () => {
    const result = validateAddress(
      '0xf5d5714c08vc112843aca74f8c498da06cc5a2d63153b825189baa51043b1f0b',
      substrateChain,
    );
    expect(result).toEqual(false);
  });

  test('should fail validation for incorrect ss58 address', () => {
    const result = validateAddress('16fL8yLyXv3V3L3z9ofR1ovFLziyXaN1DPq4yffMAZ9czzBD', substrateChain);
    expect(result).toEqual(false);
  });

  test('should pass validation for valid public key', () => {
    const result = validateAddress(
      '0xf5d5714c084c112843aca74f8c498da06cc5a2d63153b825189baa51043b1f0b',
      substrateChain,
    );
    expect(result).toEqual(true);
  });

  test('should pass validation for valid ss58 address', () => {
    const result = validateAddress('16ZL8yLyXv3V3L3z9ofR1ovFLziyXaN1DPq4yffMAZ9czzBD', substrateChain);
    expect(result).toEqual(true);
  });

  test('should pass validation for valid H160 address', () => {
    const result = validateAddress('0x629C0eC6B23D0E3A2f67c2753660971faa9A1907', evmChain);
    expect(result).toEqual(true);
  });

  test('should pass validation for non-normalized H160 address', () => {
    const result = validateAddress('0x4c2ab98b646ce36df6a4a4407ab9fcee1c90549a', evmChain);
    expect(result).toEqual(true);
  });

  test('should fail validation for short random set of bytes', () => {
    const result = validateAddress('0x00010200102', substrateChain);
    expect(result).toEqual(false);
  });

  test('should fail validation for invalid set of chars', () => {
    const result = validateAddress('randomaddress', substrateChain);
    expect(result).toEqual(false);
  });

  test('short address is not valid', () => {
    const result = validateAddress('F7NZ', substrateChain);
    expect(result).toEqual(false);
  });
});

describe('isGeneratedAccountName', () => {
  const accountId = toAccountId(TEST_ADDRESS);
  const shortOwn = (chunk: number, prefix?: number) => toShortAddress(toAddress(accountId, { prefix }), chunk);

  test('should match the own address shortened with the app chunk sizes and fallback prefixes', () => {
    expect(isGeneratedAccountName(shortOwn(5), accountId, undefined)).toBe(true);
    expect(isGeneratedAccountName(shortOwn(6), accountId, undefined)).toBe(true);
    expect(isGeneratedAccountName(shortOwn(5, 42), accountId, undefined)).toBe(true);
    expect(isGeneratedAccountName(toShortAddress(accountId, 5), accountId, undefined)).toBe(true);
  });

  test('should match the own address under the given chain prefix only when it is passed', () => {
    expect(isGeneratedAccountName(shortOwn(5, 2), accountId, 2)).toBe(true);
    expect(isGeneratedAccountName(shortOwn(5, 2), accountId, undefined)).toBe(false);
  });

  test('should match proxy names built over the own address', () => {
    expect(isGeneratedAccountName(`Any for ${shortOwn(6)}`, accountId, undefined)).toBe(true);
    expect(isGeneratedAccountName(`Any for pure ${shortOwn(5)}`, accountId, undefined)).toBe(true);
  });

  test('should not match user names or another address', () => {
    expect(isGeneratedAccountName('Team...Fund', accountId, undefined)).toBe(false);
    expect(isGeneratedAccountName('Team treasury', accountId, undefined)).toBe(false);
    expect(isGeneratedAccountName(toShortAddress(toAddress(TEST_ACCOUNTS[1]), 5), accountId, undefined)).toBe(false);
  });
});
