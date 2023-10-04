import { getRoundedFiatValue } from '@renderer/shared/lib/utils';

describe('Check number formatting', () => {
  test.each([
    ['1343', 1, 13, '0.000000000134'], // 0.0000000001343 => "0.000000000134"
    ['12344343', 1, 11, '0.000123'], // 0.00012344343 => "0.000123"
    ['1005', 1, 4, '0.1005'], // 1.005 => "1.005"
    ['1123456', 1, 6, '1.12345'], // 1.123456 => "1.12345"
    ['10023', 1, 2, '100.23'], // 100.23 => "100.23"
    ['100123456', 1, 6, '100.12'], // 100.123456 => "100.12"
    ['12345000000', 1, 1, '12.34B'], // 12345000000 => "12.34B"
    ['12345000000000', 1, 1, '12.34T'], // 12345000000000 => "12.34T"
    ['315000041811', 1, 12, '0.315'], // 0.315000041811 => 0.315
    ['9999999', 1, 10, '0.000999'], // 0.0009999999 => 0.000999
    ['99999999', 1, 5, '999.99'], // 999,99999 => 999,99
  ])(
    'should return correct rounded fiat value for assetBalance %s, price %d, and precision %d',
    (assetBalance: string, price: number, precision: number, expected: string) => {
      const result = getRoundedFiatValue(assetBalance, price, precision);
      expect(result.toString()).toEqual(expected);
    },
  );
});

describe('Check price apply', () => {
  test.each([
    ['1343', 2, 13, '0.000000000268'], // 0.0000000001343 * 2 = 0,0000000002686 => "0.000000000268"
    ['99999999', 2, 5, '1999.99'], // 999,99999 * 2 = 1_999,99998 => 1999.99
    ['99999999', 9999, 8, '9998.99'], // 0.99999999 * 9999 = 9_998,99990001 => "9998,99"
    ['12345000000', 2, 1, '24.69B'], // 12345000000 * 2 = 24_690_000_000 => "24.69B"
    ['12345000000000', 2, 1, '24.69T'], // 12345000000000 * 2 = 24_690_000_000_000 => "24.69T"
  ])(
    'should return correct rounded fiat value for assetBalance %s, price %d, and precision %d',
    (assetBalance: string, price: number, precision: number, expected: string) => {
      const result = getRoundedFiatValue(assetBalance, price, precision);
      expect(result.toString()).toEqual(expected);
    },
  );
});
