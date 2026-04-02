import { BN, BN_ZERO } from '@polkadot/util';

import { type AssetId, type Balance, type BalanceDraft, type BalanceMap, type ChainId, AssetType } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { balanceUtils } from '../balance-utils';

const accountId = '0x01' as AccountId;
const chainId = '0x00' as ChainId;
const assetId = 0 as AssetId;

function makeBalance(overrides: Partial<Balance> = {}): Balance {
  const id = balanceUtils.constructBalanceId(
    overrides.accountId ?? accountId,
    overrides.chainId ?? chainId,
    overrides.assetId ?? assetId,
  );

  return {
    id,
    accountId,
    chainId,
    assetId,
    assetType: AssetType.NATIVE,
    free: new BN(100),
    frozen: BN_ZERO,
    reserved: BN_ZERO,
    locked: [],
    providers: 1,
    consumers: 0,
    sufficients: 0,
    ed: new BN(1),
    transferableMode: 'legacy',
    ...overrides,
  };
}

describe('balance-utils', () => {
  describe('constructBalanceId', () => {
    test('should build id from parts', () => {
      expect(balanceUtils.constructBalanceId(accountId, chainId, assetId)).toBe('0x01 0x00 0');
    });
  });

  describe('getAssetBalances', () => {
    test('should return matching balances', () => {
      const balance = makeBalance();
      const map: BalanceMap = { [balance.id]: balance };

      const result = balanceUtils.getAssetBalances(map, [accountId], chainId, assetId);
      expect(result).toEqual([balance]);
    });

    test('should skip missing balances', () => {
      const result = balanceUtils.getAssetBalances({}, [accountId], chainId, assetId);
      expect(result).toEqual([]);
    });
  });

  describe('getBalance', () => {
    test('should return balance when present', () => {
      const balance = makeBalance();
      const map: BalanceMap = { [balance.id]: balance };

      expect(balanceUtils.getBalance(map, accountId, chainId, assetId)).toBe(balance);
    });

    test('should return null when missing', () => {
      expect(balanceUtils.getBalance({}, accountId, chainId, assetId)).toBeNull();
    });
  });

  describe('mergeBalanceMapWithNewBalances', () => {
    test('should return same map for empty new balances', () => {
      const map: BalanceMap = {};
      const result = balanceUtils.mergeBalanceMapWithNewBalances(map, []);

      expect(result.map).toBe(map);
      expect(result.updated).toEqual({});
    });

    test('should add new balance when not in map', () => {
      const draft: BalanceDraft = {
        accountId,
        chainId,
        assetId,
        assetType: AssetType.NATIVE,
        free: new BN(50),
      };

      const result = balanceUtils.mergeBalanceMapWithNewBalances({}, [draft]);
      const id = balanceUtils.constructBalanceId(accountId, chainId, assetId);

      expect(result.map[id]).toBeDefined();
      expect(result.map[id]!.free.eq(new BN(50))).toBe(true);
      expect(result.updated[id]).toBeDefined();
    });

    test('should skip update when values are the same', () => {
      const balance = makeBalance();
      const map: BalanceMap = { [balance.id]: balance };

      const draft: BalanceDraft = {
        accountId,
        chainId,
        assetId,
        assetType: AssetType.NATIVE,
        free: new BN(100),
        frozen: BN_ZERO,
        reserved: BN_ZERO,
        locked: [],
        providers: 1,
        consumers: 0,
        sufficients: 0,
        ed: new BN(1),
        transferableMode: 'legacy',
      };

      const result = balanceUtils.mergeBalanceMapWithNewBalances(map, [draft]);

      // No updates — returns original map reference
      expect(result.map).toBe(map);
      expect(result.updated).toEqual({});
    });

    test('should merge when values differ', () => {
      const balance = makeBalance();
      const map: BalanceMap = { [balance.id]: balance };

      const draft: BalanceDraft = {
        accountId,
        chainId,
        assetId,
        assetType: AssetType.NATIVE,
        free: new BN(200),
      };

      const result = balanceUtils.mergeBalanceMapWithNewBalances(map, [draft]);

      expect(result.map[balance.id]!.free.eq(new BN(200))).toBe(true);
      expect(result.updated[balance.id]).toBeDefined();
    });
  });
});
