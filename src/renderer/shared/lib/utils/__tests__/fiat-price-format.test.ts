import { formatFiatBalance, getRoundedValue } from '../balance';

describe('shared/lib/onChainUtils/balance', () => {
  describe('formatFiatBalance', () => {
    test.each([
      ['1343', 13, '0.000000000134'], // 0.0000000001343 => "0.000000000134"
      ['12344343', 11, '0.000123'], // 0.00012344343 => "0.000123"
      ['1005', 4, '0.1005'], // 1.005 => "1.005"
      ['1123456', 6, '1.12345'], // 1.123456 => "1.12345"
      ['10023', 2, '100.23'], // 100.23 => "100.23"
      ['100123456', 6, '100.12'], // 100.123456 => "100.12"
      ['5923210799282', 12, '5.92321'], // 100.123456 => "100.12"
      ['9999999', 10, '0.000999'], // 0.0009999999 => 0.000999
      ['99999999', 5, '999.99'], // 999,99999 => 999,99
      ['315000041811', 12, '0.315'], // 0.315000041811 => 0.315
    ])('should format small numbers with precision', (assetBalance: string, precision: number, expected: string) => {
      const { value, suffix } = formatFiatBalance(assetBalance, precision);
      expect(`${value}${suffix}`).toEqual(expected);
    });

    test('should calculate thousands', () => {
      const { value, suffix, decimalPlaces } = formatFiatBalance('16172107992822306', 12);

      expect(value).toEqual('16172.1');
      expect(suffix).toEqual('');
      expect(decimalPlaces).toEqual(2);
    });

    test('should calculate millions', () => {
      const { value, suffix, decimalPlaces } = formatFiatBalance('1617210799282230602', 12);

      expect(value).toEqual('1.61');
      expect(suffix).toEqual('M');
      expect(decimalPlaces).toEqual(2);
    });

    test('should calculate billion', () => {
      const { value, suffix, decimalPlaces } = formatFiatBalance('8717210799282230602024', 12);

      expect(value).toEqual('8.71');
      expect(suffix).toEqual('B');
      expect(decimalPlaces).toEqual(2);
    });

    test('should calculate trillion', () => {
      const { value, suffix, decimalPlaces } = formatFiatBalance('91528717210799282230602024', 12);

      expect(value).toEqual('91.52');
      expect(suffix).toEqual('T');
      expect(decimalPlaces).toEqual(2);
    });
  });

  describe('getRoundedFiatValue', () => {
    test.each([
      ['1343', 2, 13, '0.000000000268'], // 0.0000000001343 * 2 = 0,0000000002686 => "0.000000000268"
      ['99999999', 2, 5, '1999.99'], // 999,99999 * 2 = 1_999,99998 => 1999.99
      ['99999999', 9999, 8, '9998.99'], // 0.99999999 * 9999 = 9_998,99990001 => "9998,99"
      ['12345000000', 2, 0, '24690000000'], // 12345000000 * 2 = 24_690_000_000 => "24690000000"
      ['12345000000000', 2, 1, '2469000000000'], // 12345000000000 * 2 = 24_690_000_000_000 => "2469000000000"
    ])(
      'should calculate fiat value based on price and precision',
      (assetBalance: string, price: number, precision: number, expected: string) => {
        const result = getRoundedValue(assetBalance, price, precision);
        expect(result.toString()).toEqual(expected);
      },
    );
  });
});
