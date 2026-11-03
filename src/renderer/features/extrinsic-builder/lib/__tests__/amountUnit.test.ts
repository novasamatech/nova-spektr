import { type Chain } from '@/shared/core';
import { fromBaseUnits, resolveAmountUnit, toBaseUnits } from '../amountUnit';

const assetHub = {
  assets: [
    { assetId: 0, symbol: 'DOT', precision: 10, type: 'native' },
    { assetId: 1, symbol: 'USDT', precision: 6, type: 'statemine', typeExtras: { assetId: '1984' } },
    {
      assetId: 2,
      symbol: 'KSM',
      precision: 12,
      type: 'statemine',
      typeExtras: { assetId: '0x02010902', palletName: 'ForeignAssets' },
    },
  ],
} as unknown as Chain;

const resolve = (pallet: string, method: string, args: Record<string, unknown> = {}) =>
  resolveAmountUnit({ chain: assetHub, pallet, method, args });

describe('features/extrinsic-builder/lib/amountUnit', () => {
  describe('resolveAmountUnit', () => {
    it('uses the native token for native-balance pallets', () => {
      expect(resolve('balances', 'transferKeepAlive')).toEqual({ precision: 10, symbol: 'DOT' });
      expect(resolve('staking', 'bond')).toEqual({ precision: 10, symbol: 'DOT' });
    });

    it('uses the referenced asset for assets calls', () => {
      expect(resolve('assets', 'transfer', { id: '1984' })).toEqual({ precision: 6, symbol: 'USDT' });
    });

    it('falls back to base units for an unknown asset id or a missing id', () => {
      expect(resolve('assets', 'transfer', { id: '42' })).toBeNull();
      expect(resolve('assets', 'transfer', { id: '' })).toBeNull();
      expect(resolve('assets', 'transfer')).toBeNull();
    });

    it('does not match an asset of another pallet by id', () => {
      expect(resolve('poolAssets', 'transfer', { id: '1984' })).toBeNull();
    });

    it.each([
      ['foreignAssets', 'transfer'],
      ['xcmPallet', 'limitedReserveTransferAssets'],
      ['polkadotXcm', 'transferAssets'],
      ['assetConversion', 'swapExactTokensForTokens'],
      ['treasury', 'spend'],
      ['someUnknownPallet', 'call'],
    ])('falls back to base units for %s.%s', (pallet, method) => {
      expect(resolve(pallet, method)).toBeNull();
    });

    it('returns null without a chain or call', () => {
      expect(resolveAmountUnit({ chain: null, pallet: 'balances', method: 'transfer', args: {} })).toBeNull();
      expect(resolveAmountUnit({ chain: assetHub, pallet: 'balances', method: null, args: {} })).toBeNull();
    });
  });

  describe('toBaseUnits / fromBaseUnits', () => {
    const usdt = { precision: 6, symbol: 'USDT' };

    it('scales by the unit precision and back', () => {
      expect(toBaseUnits('1.5', usdt)).toBe('1500000');
      expect(fromBaseUnits('1500000', usdt)).toBe('1.5');
    });

    it('encodes an assets.transfer amount with the asset precision, not the native one', () => {
      expect(toBaseUnits('1.5', resolve('assets', 'transfer', { id: '1984' }))).toBe('1500000');
    });

    it('passes whole base units through unchanged without a unit', () => {
      expect(toBaseUnits('1000000000', null)).toBe('1000000000');
      expect(fromBaseUnits('1000000000', null)).toBe('1000000000');
    });

    it.each(['1.5', '-1', '1e5', ''])('refuses %s as base units', (amount) => {
      expect(() => toBaseUnits(amount, null)).toThrow();
    });
  });
});
