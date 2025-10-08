import { BN, BN_ZERO } from '@polkadot/util';
import { describe, expect, test } from 'vitest';

import { type AssetBalance, type AssetId, type Balance, type BalanceId } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';

import { getAvailableAmount } from './getAvailableAmount';

const createBalance = (params: {
  free?: string | number;
  frozen?: string | number;
  reserved?: string | number;
  ed?: string | number;
  locked?: AssetBalance['locked'];
  transferableMode?: Balance['transferableMode'];
}): Balance => {
  return {
    id: '0' as BalanceId,
    transferableMode: params.transferableMode || 'holdAndFreezes',
    accountId: '0x00' as AccountId,
    assetId: 0 as AssetId,
    chainId: '0x00',
    ed: new BN(params.ed || '1000000000000'), // 1 DOT default ED
    free: new BN(params.free || '0'),
    frozen: new BN(params.frozen || '0'),
    reserved: new BN(params.reserved || '0'),
    locked: params.locked || [],
  };
};

describe('getAvailableAmount', () => {
  describe('without ED included (includeED: false)', () => {
    test('should subtract ED from available balance when ED > reserved', () => {
      const balance = createBalance({
        free: '100000000000000', // 100 DOT
        frozen: '0',
        reserved: '0',
        ed: '1000000000000', // 1 DOT
      });
      const totalFee = new BN('100000000000'); // 0.1 DOT

      const result = getAvailableAmount({
        balance,
        totalFee,
        includeED: false,
      });

      // Available = 100 - max(0, 1) - 0.1 = 98.9 DOT
      expect(result.toString()).toBe('98900000000000');
    });

    test('should subtract reserved when reserved > ED', () => {
      const balance = createBalance({
        free: '100000000000000', // 100 DOT
        frozen: '0',
        reserved: '5000000000000', // 5 DOT
        ed: '1000000000000', // 1 DOT
      });
      const totalFee = new BN('100000000000'); // 0.1 DOT

      const result = getAvailableAmount({
        balance,
        totalFee,
        includeED: false,
      });

      // Transferable = 100 - max(0, 0 - 5) = 100 - 0 = 100 DOT
      // Available = 100 - 1 (ED) - 0.1 (fee) = 98.9 DOT
      expect(result.toString()).toBe('98900000000000');
    });

    test('should handle case when frozen > reserved (holdAndFreezes mode)', () => {
      const balance = createBalance({
        free: '100000000000000', // 100 DOT
        frozen: '60000000000000', // 60 DOT (staked)
        reserved: '5000000000000', // 5 DOT
        ed: '1000000000000', // 1 DOT
        transferableMode: 'holdAndFreezes',
      });
      const totalFee = new BN('100000000000'); // 0.1 DOT

      const result = getAvailableAmount({
        balance,
        totalFee,
        includeED: false,
      });

      // Transferable = 100 - max(0, 60 - 5) = 100 - 55 = 45 DOT
      // Available = 45 - 1 (ED) - 0.1 (fee) = 43.9 DOT
      expect(result.toString()).toBe('43900000000000');
    });

    test('should not allow negative amounts', () => {
      const balance = createBalance({
        free: '2000000000000', // 2 DOT
        frozen: '0',
        reserved: '0',
        ed: '1000000000000', // 1 DOT
      });
      const totalFee = new BN('2000000000000'); // 2 DOT fee (exceeds available)

      const result = getAvailableAmount({
        balance,
        totalFee,
        includeED: false,
      });

      // Available = 2 - max(0, 1) - 2 = -1, should be clamped to 0
      expect(result.toString()).toBe('0');
    });

    test('should handle high fees that exceed transferable balance', () => {
      const balance = createBalance({
        free: '10000000000000', // 10 DOT
        frozen: '0',
        reserved: '0',
        ed: '1000000000000', // 1 DOT
      });
      const totalFee = new BN('15000000000000'); // 15 DOT

      const result = getAvailableAmount({
        balance,
        totalFee,
        includeED: false,
      });

      // Available = 10 - max(0, 1) - 15 = -6, should be 0
      expect(result.toString()).toBe('0');
    });

    test('should handle case when transferable is exactly ED + fee', () => {
      const balance = createBalance({
        free: '2100000000000', // 2.1 DOT
        frozen: '0',
        reserved: '0',
        ed: '1000000000000', // 1 DOT
      });
      const totalFee = new BN('100000000000'); // 0.1 DOT

      const result = getAvailableAmount({
        balance,
        totalFee,
        includeED: false,
      });

      // Available = 2.1 - max(0, 1) - 0.1 = 1 DOT
      expect(result.toString()).toBe('1000000000000');
    });

    test('should handle legacy transferable mode', () => {
      const balance = createBalance({
        free: '100000000000000', // 100 DOT
        frozen: '60000000000000', // 60 DOT
        reserved: '5000000000000', // 5 DOT (should not affect transferable in legacy mode)
        ed: '1000000000000', // 1 DOT
        transferableMode: 'legacy',
      });
      const totalFee = new BN('100000000000'); // 0.1 DOT

      const result = getAvailableAmount({
        balance,
        totalFee,
        includeED: false,
      });

      // Transferable (legacy) = 100 - 60 = 40 DOT
      // Available = 40 - 1 (ED) - 0.1 (fee) = 38.9 DOT
      expect(result.toString()).toBe('38900000000000');
    });
  });

  describe('with ED included (includeED: true)', () => {
    test('should allow spending ED when enabled', () => {
      const balance = createBalance({
        free: '100000000000000', // 100 DOT
        frozen: '0',
        reserved: '0',
        ed: '1000000000000', // 1 DOT
      });
      const totalFee = new BN('100000000000'); // 0.1 DOT

      const result = getAvailableAmount({
        balance,
        totalFee,
        includeED: true,
      });

      // Available = 100 - max(0, 0) - 0.1 = 99.9 DOT (ED not deducted)
      expect(result.toString()).toBe('99900000000000');
    });

    test('should still subtract reserved when ED is included', () => {
      const balance = createBalance({
        free: '100000000000000', // 100 DOT
        frozen: '0',
        reserved: '5000000000000', // 5 DOT
        ed: '1000000000000', // 1 DOT
      });
      const totalFee = new BN('100000000000'); // 0.1 DOT

      const result = getAvailableAmount({
        balance,
        totalFee,
        includeED: true,
      });

      // Transferable = 100 - max(0, 0 - 5) = 100 DOT
      // Available = 100 - 0 (ED not deducted) - 0.1 (fee) = 99.9 DOT
      expect(result.toString()).toBe('99900000000000');
    });

    test('should allow transferring entire balance minus fee and reserved', () => {
      const balance = createBalance({
        free: '10000000000000', // 10 DOT
        frozen: '0',
        reserved: '0',
        ed: '1000000000000', // 1 DOT
      });
      const totalFee = new BN('100000000000'); // 0.1 DOT

      const result = getAvailableAmount({
        balance,
        totalFee,
        includeED: true,
      });

      // Available = 10 - max(0, 0) - 0.1 = 9.9 DOT (can spend ED)
      expect(result.toString()).toBe('9900000000000');
    });

    test('should handle frozen balance with ED included', () => {
      const balance = createBalance({
        free: '100000000000000', // 100 DOT
        frozen: '60000000000000', // 60 DOT
        reserved: '5000000000000', // 5 DOT
        ed: '1000000000000', // 1 DOT
      });
      const totalFee = new BN('100000000000'); // 0.1 DOT

      const result = getAvailableAmount({
        balance,
        totalFee,
        includeED: true,
      });

      // Transferable = 100 - max(0, 60 - 5) = 100 - 55 = 45 DOT
      // Available = 45 - 0 (ED not deducted) - 0.1 (fee) = 44.9 DOT
      expect(result.toString()).toBe('44900000000000');
    });

    test('should correctly calculate when ED is larger than reserved', () => {
      const balance = createBalance({
        free: '100000000000000', // 100 DOT
        frozen: '0',
        reserved: '500000000000', // 0.5 DOT
        ed: '1000000000000', // 1 DOT
      });
      const totalFee = new BN('100000000000'); // 0.1 DOT

      const result = getAvailableAmount({
        balance,
        totalFee,
        includeED: true,
      });

      // Transferable = 100 - max(0, 0 - 0.5) = 100 DOT
      // Available = 100 - 0 (ED not deducted) - 0.1 (fee) = 99.9 DOT
      expect(result.toString()).toBe('99900000000000');
    });
  });

  describe('edge cases', () => {
    test('should return zero for null balance', () => {
      const result = getAvailableAmount({
        balance: null,
        totalFee: new BN('100000000000'),
        includeED: false,
      });

      expect(result.toString()).toBe('0');
    });

    test('should handle zero fee', () => {
      const balance = createBalance({
        free: '100000000000000', // 100 DOT
        frozen: '0',
        reserved: '0',
        ed: '1000000000000', // 1 DOT
      });
      const totalFee = BN_ZERO;

      const result = getAvailableAmount({
        balance,
        totalFee,
        includeED: false,
      });

      // Available = 100 - max(0, 1) - 0 = 99 DOT
      expect(result.toString()).toBe('99000000000000');
    });

    test('should handle zero ED', () => {
      const balance = createBalance({
        free: '100000000000000', // 100 DOT
        frozen: '0',
        reserved: '0',
        ed: '0',
      });
      const totalFee = new BN('100000000000'); // 0.1 DOT

      const result = getAvailableAmount({
        balance,
        totalFee,
        includeED: false,
      });

      // Available = 100 - max(0, 0) - 0.1 = 99.9 DOT
      expect(result.toString()).toBe('99900000000000');
    });

    test('should handle very small balances below ED', () => {
      const balance = createBalance({
        free: '500000000000', // 0.5 DOT
        frozen: '0',
        reserved: '0',
        ed: '1000000000000', // 1 DOT
      });
      const totalFee = new BN('10000000000'); // 0.01 DOT

      const result = getAvailableAmount({
        balance,
        totalFee,
        includeED: false,
      });

      // Available = 0.5 - max(0, 1) - 0.01 = -0.51, should be 0
      expect(result.toString()).toBe('0');
    });

    test('should handle very large balances', () => {
      const balance = createBalance({
        free: '1000000000000000000000', // 1,000,000,000 DOT (1 billion)
        frozen: '500000000000000000000', // 500,000,000 DOT (500 million)
        reserved: '10000000000000000000', // 10,000,000 DOT (10 million)
        ed: '1000000000000', // 1 DOT
      });
      const totalFee = new BN('100000000000000'); // 100 DOT

      const result = getAvailableAmount({
        balance,
        totalFee,
        includeED: false,
      });

      // Transferable = 1B - max(0, 500M - 10M) = 1B - 490M = 510M DOT
      // Available = 510M - 1 (ED) - 100 (fee) = 509,999,899 DOT
      expect(result.toString()).toBe('509999899000000000000');
    });

    test('should handle all zero values', () => {
      const balance = createBalance({
        free: '0',
        frozen: '0',
        reserved: '0',
        ed: '0',
      });
      const totalFee = BN_ZERO;

      const result = getAvailableAmount({
        balance,
        totalFee,
        includeED: false,
      });

      expect(result.toString()).toBe('0');
    });
  });

  describe('comparison: ED included vs not included', () => {
    test('difference should be exactly ED amount when reserved is 0', () => {
      const balance = createBalance({
        free: '100000000000000', // 100 DOT
        frozen: '0',
        reserved: '0',
        ed: '1000000000000', // 1 DOT
      });
      const totalFee = new BN('100000000000'); // 0.1 DOT

      const withoutED = getAvailableAmount({
        balance,
        totalFee,
        includeED: false,
      });

      const withED = getAvailableAmount({
        balance,
        totalFee,
        includeED: true,
      });

      const difference = withED.sub(withoutED);
      expect(difference.toString()).toBe(balance.ed.toString());
    });

    test('difference should be exactly ED when reserved > ED', () => {
      const balance = createBalance({
        free: '100000000000000', // 100 DOT
        frozen: '0',
        reserved: '5000000000000', // 5 DOT
        ed: '1000000000000', // 1 DOT
      });
      const totalFee = new BN('100000000000'); // 0.1 DOT

      const withoutED = getAvailableAmount({
        balance,
        totalFee,
        includeED: false,
      });

      const withED = getAvailableAmount({
        balance,
        totalFee,
        includeED: true,
      });

      // Difference should still be exactly ED amount
      const difference = withED.sub(withoutED);
      expect(difference.toString()).toBe(balance.ed.toString());
    });
  });
});
