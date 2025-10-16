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

      // Transferable = 100 - max(0, 0 - 0) = 100 DOT
      // Deductible = max(0, 1 - 0) = 1 DOT (ED not covered by reserved)
      // Available = 100 - 1 - 0.1 = 98.9 DOT
      expect(result.toString()).toBe('98900000000000');
    });

    test('should not subtract ED when frozen >= ED', () => {
      const balance = createBalance({
        free: '100000000000000', // 100 DOT
        frozen: '5000000000000', // 5 DOT
        reserved: '0',
        ed: '1000000000000', // 1 DOT
      });
      const totalFee = new BN('100000000000'); // 0.1 DOT

      const result = getAvailableAmount({
        balance,
        totalFee,
        includeED: false,
      });

      // Transferable = 100 - max(0, 5 - 0) = 95 DOT
      // Deductible = max(0, 1 - 5) = 0 (ED covered by frozen)
      // Available = 95 - 0 - 0.1 = 94.9 DOT
      expect(result.toString()).toBe('94900000000000');
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

      // Transferable = 100 - max(0, 60 - 5) = 45 DOT
      // Deductible = max(0, 1 - 60) = 0 (ED covered by frozen)
      // Available = 45 - 0 - 0.1 = 44.9 DOT
      expect(result.toString()).toBe('44900000000000');
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

      // Transferable = 2.1 DOT
      // Deductible = max(0, 1 - 0) = 1 DOT
      // Available = 2.1 - 1 - 0.1 = 1 DOT
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
      // Deductible = max(0, 1 - 60) = 0 (ED covered by frozen)
      // Available = 40 - 0 - 0.1 = 39.9 DOT
      expect(result.toString()).toBe('39900000000000');
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

      // Transferable = 100 DOT
      // Deductible = 0 (ED included, so not deducted)
      // Available = 100 - 0 - 0.1 = 99.9 DOT
      expect(result.toString()).toBe('99900000000000');
    });

    test('should not deduct ED when includeED is true, even without reserved', () => {
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
      // Deductible = 0 (ED included)
      // Available = 100 - 0 - 0.1 = 99.9 DOT
      expect(result.toString()).toBe('99900000000000');
    });

    test('should allow transferring entire balance minus fee', () => {
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

      // Transferable = 10 DOT
      // Deductible = 0 (ED included)
      // Available = 10 - 0 - 0.1 = 9.9 DOT (can spend ED)
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

      // Transferable = 100 - max(0, 60 - 5) = 45 DOT
      // Deductible = 0 (ED included)
      // Available = 45 - 0 - 0.1 = 44.9 DOT
      expect(result.toString()).toBe('44900000000000');
    });

    test('should not deduct ED even when ED > reserved', () => {
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
      // Deductible = 0 (ED included, so not deducted)
      // Available = 100 - 0 - 0.1 = 99.9 DOT
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

      // Transferable = 100 DOT
      // Deductible = max(0, 0 - 0) = 0
      // Available = 100 - 0 - 0.1 = 99.9 DOT
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
      // Deductible = max(0, 1 - 10M) = 0 (ED covered by reserved)
      // Available = 510M - 0 - 100 = 509,999,900 DOT
      expect(result.toString()).toBe('509999900000000000000');
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

    test('difference should be exactly ED when frozen > ED', () => {
      const balance = createBalance({
        free: '100000000000000', // 100 DOT
        frozen: '5000000000000', // 5 DOT
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

      // When frozen > ED, ED is covered by frozen, so no difference
      const difference = withED.sub(withoutED);
      expect(difference.toString()).toBe('0');
    });
  });
});
