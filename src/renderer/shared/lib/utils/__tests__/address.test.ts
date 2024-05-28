import { TEST_ACCOUNTS, TEST_ADDRESS } from '@shared/lib/utils';
import { toAddress, validateAddress } from '../address';

describe('shared/lib/onChainUtils/address', () => {
  test('should convert address to Polkadot', () => {
    const address = toAddress(TEST_ACCOUNTS[0], { prefix: 0 });
    expect(address).toEqual(TEST_ADDRESS);
  });

  test('should convert address to Substrate', () => {
    const address = toAddress(TEST_ACCOUNTS[0]);
    expect(address).toEqual('5CGQ7BPJZZKNirQgVhzbX9wdkgbnUHtJ5V7FkMXdZeVbXyr9');
  });

  test('should convert address with default prefix', () => {
    const address = toAddress(TEST_ADDRESS);
    expect(address).toEqual('5CGQ7BPJZZKNirQgVhzbX9wdkgbnUHtJ5V7FkMXdZeVbXyr9');
  });

  test('should convert address to specific prefix', () => {
    const address = toAddress(TEST_ADDRESS, { prefix: 0 });
    expect(address).toEqual(TEST_ADDRESS);
  });

  test('should fail validation for short address', () => {
    const result = validateAddress('0x00');
    expect(result).toEqual(false);
  });

  test('should fail validation for invalid public key', () => {
    const result = validateAddress('0xf5d5714c08vc112843aca74f8c498da06cc5a2d63153b825189baa51043b1f0b');
    expect(result).toEqual(false);
  });

  test('should fail validation for incorrect ss58 address', () => {
    const result = validateAddress('16fL8yLyXv3V3L3z9ofR1ovFLziyXaN1DPq4yffMAZ9czzBD');
    expect(result).toEqual(false);
  });

  test('should pass validation for valid public', () => {
    const result = validateAddress('0xf5d5714c084c112843aca74f8c498da06cc5a2d63153b825189baa51043b1f0b');
    expect(result).toEqual(true);
  });

  test('should pass validation for valid ss58 address', () => {
    const result = validateAddress('16ZL8yLyXv3V3L3z9ofR1ovFLziyXaN1DPq4yffMAZ9czzBD');
    expect(result).toEqual(true);
  });

  test('should fail validation for random set of bytes', () => {
    const result = validateAddress('0x00010200102');
    expect(result).toEqual(false);
  });

  test('should fail validation for invalid set of chars', () => {
    const result = validateAddress('randomaddress');
    expect(result).toEqual(false);
  });

  test('short address is not valid', () => {
    const result = validateAddress('F7NZ');
    expect(result).toEqual(false);
  });
});
