import { TEST_PUBLIC_KEY } from '@renderer/services/balance/common/constants';
import { formatBalance, toAddress } from '../common/utils';

describe('services/balance/utils', () => {
  describe('formatBalance', () => {
    test('should calculate small amount', () => {
      const { value, suffix, decimalPlaces } = formatBalance('5923210799282', 12);

      expect(value).toEqual('5.92321');
      expect(suffix).toEqual('');
      expect(decimalPlaces).toEqual(5);
    });

    test('should calculate thousands', () => {
      const { value, suffix, decimalPlaces } = formatBalance('16172107992822306', 12);

      expect(value).toEqual('16172.1');
      expect(suffix).toEqual('');
      expect(decimalPlaces).toEqual(2);
    });

    test('should calculate millions', () => {
      const { value, suffix, decimalPlaces } = formatBalance('1617210799282230602', 12);

      expect(value).toEqual('1.61');
      expect(suffix).toEqual('M');
      expect(decimalPlaces).toEqual(2);
    });

    test('should calculate billion', () => {
      const { value, suffix, decimalPlaces } = formatBalance('8717210799282230602024', 12);

      expect(value).toEqual('8.71');
      expect(suffix).toEqual('B');
      expect(decimalPlaces).toEqual(2);
    });

    test('should calculate trillion', () => {
      const { value, suffix, decimalPlaces } = formatBalance('91528717210799282230602024', 12);

      expect(value).toEqual('91.52');
      expect(suffix).toEqual('T');
      expect(decimalPlaces).toEqual(2);
    });
  });

  describe('formatBalance', () => {
    test('should convert address to Polkadot', () => {
      const address = toAddress(TEST_PUBLIC_KEY, 0);
      expect(address).toEqual('1ChFWeNRLarAPRCTM3bfJmncJbSAbSS9yqjueWz7jX7iTVZ');
    });

    test('should convert address to Substrate', () => {
      const address = toAddress(TEST_PUBLIC_KEY);
      expect(address).toEqual('5CGQ7BPJZZKNirQgVhzbX9wdkgbnUHtJ5V7FkMXdZeVbXyr9');
    });
  });
});
