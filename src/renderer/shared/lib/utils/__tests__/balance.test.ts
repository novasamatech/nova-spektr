import { BN, BN_ZERO } from '@polkadot/util';

import { type AssetBalance, type AssetId, type Balance, type BalanceId, LockTypes } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { formatAmount, formatBalance, stakeableAmountBN, transferableAmountBN, withdrawableAmount } from '../balance';

const createBalance = (params: {
  free?: string | number;
  frozen?: string | number;
  reserved?: string | number;
  locked?: AssetBalance['locked'];
}): Balance => {
  return {
    id: '0' as BalanceId,
    transferableMode: 'holdAndFreezes',
    accountId: '0x00' as AccountId,
    assetId: 0 as AssetId,
    chainId: '0x00',
    ed: BN_ZERO,
    free: new BN(params.free || '0'),
    frozen: new BN(params.frozen || '0'),
    reserved: new BN(params.reserved || '0'),
    locked: params.locked || [],
  };
};

describe('shared/lib/onChainUtils/balance', () => {
  describe('formatAmount', () => {
    test('should handle regular decimal values', () => {
      const result1 = formatAmount('1.5', 12);
      const result2 = formatAmount('123.456', 6);

      expect(result1).toEqual('1500000000000');
      expect(result2).toEqual('123456000');
    });

    test('should handle whole numbers', () => {
      const result1 = formatAmount('1', 12);
      const result2 = formatAmount('123', 6);

      expect(result1).toEqual('1000000000000');
      expect(result2).toEqual('123000000');
    });

    test('should handle decimal values without leading zero', () => {
      const result1 = formatAmount('.1', 12);
      const result2 = formatAmount('0.1', 12);
      const result3 = formatAmount('.5', 10);
      const result4 = formatAmount('.123456', 6);

      expect(result1).toEqual('100000000000');
      expect(result2).toEqual('100000000000');
      expect(result3).toEqual('5000000000');
      expect(result4).toEqual('123456');
    });
  });

  describe('formatBalance', () => {
    test('should calculate amount without without float part', () => {
      const { value, suffix, decimalPlaces } = formatBalance('50000000000000', 12);

      expect(value).toEqual('50');
      expect(suffix).toEqual('');
      expect(decimalPlaces).toEqual(2);
    });

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

    test('should also work with BN', () => {
      const { value, suffix, decimalPlaces } = formatBalance(new BN('1617210799282230602'), 12);

      expect(value).toEqual('1.61');
      expect(suffix).toEqual('M');
      expect(decimalPlaces).toEqual(2);
    });

    test('should add correct shorthands, when parametrized', () => {
      const { value, suffix, decimalPlaces } = formatBalance('5200000000000000', 12, {
        shorthands: { K: true },
      });

      expect(value).toEqual('5.2');
      expect(suffix).toEqual('K');
      expect(decimalPlaces).toEqual(2);
    });
  });

  describe('transferableAmount', () => {
    test.each([
      {
        name: 'should return amount without frozen',
        balance: createBalance({ free: '100', frozen: '10' }),
        expected: '90',
      },
      {
        name: 'should add reserved to frozen',
        balance: createBalance({ free: '100', frozen: '10', reserved: '5' }),
        expected: '95',
      },
      {
        name: 'should add reserved to frozen',
        balance: createBalance({ free: '100', frozen: '10', reserved: '20' }),
        expected: '100',
      },
      {
        name: 'should return 0 when frozen exceeds free',
        balance: createBalance({ free: '50', frozen: '100' }),
        expected: '0',
      },
    ])('$name', ({ balance, expected }) => {
      const result = transferableAmountBN(balance);
      expect(result.toString()).toEqual(expected);
    });
  });

  describe('withdrawableAmount', () => {
    test.each([
      {
        name: 'should return available amount',
        balance: createBalance({ free: '100', frozen: '10' }),
        expected: '90',
      },
      {
        name: 'should return 0 when frozen equals free',
        balance: createBalance({ free: '100', frozen: '100' }),
        expected: '0',
      },
      {
        name: 'should reserved has no effect',
        balance: createBalance({ free: '100', frozen: '10', reserved: '20' }),
        expected: '90',
      },
      {
        name: 'should return 0 when frozen exceeds free',
        balance: createBalance({ free: '50', frozen: '100' }),
        expected: '0',
      },
      {
        name: 'should handle large numbers',
        balance: createBalance({
          free: '1000000000000000000',
          frozen: '10000000000000000',
          reserved: '10000000000000000',
        }),
        expected: '990000000000000000',
      },
      {
        name: 'should handle all zero values',
        balance: createBalance({}),
        expected: '0',
      },
    ])('$name', ({ balance, expected }) => {
      const result = withdrawableAmount(balance);
      expect(result).toEqual(expected);
    });
  });

  describe('stakeableAmount', () => {
    test.each([
      {
        name: 'should return available amount',
        balance: createBalance({ free: '100' }),
        expected: '100',
      },
      {
        name: 'should take staked into account',
        balance: createBalance({
          free: '100',
          locked: [
            { amount: new BN(25), type: LockTypes.STAKING },
            { amount: new BN(25), type: LockTypes.STAKING },
          ],
        }),
        expected: '50',
      },
    ])('$name', ({ balance, expected }) => {
      const result = stakeableAmountBN(balance);
      expect(result.toString()).toEqual(expected);
    });
  });
});
