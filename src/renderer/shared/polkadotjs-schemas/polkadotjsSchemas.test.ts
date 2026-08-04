import { TypeRegistry } from '@polkadot/types';
import { BN } from '@polkadot/util';
import { z } from 'zod';

import { pjsSchema } from './index';

describe('pjs zod schemas', () => {
  const registry = new TypeRegistry();

  const aliceAddress = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
  const aliceAccountId = registry.createType('AccountId32', aliceAddress).toHex();

  describe('structs', () => {
    it('tupleMap', () => {
      const schema = pjsSchema.tupleMap(['number', z.number()], ['string', z.string()]);
      const result = schema.parse([1, 'test']);

      expect(result).toEqual({
        number: 1,
        string: 'test',
      });
    });
  });

  describe('codecTuple', () => {
    it('should parse tuple codec by positional access', () => {
      const tuple = registry.createType('(AccountId32, Perbill, u32)', [aliceAddress, 100_000_000, 5]);

      const schema = pjsSchema.codecTuple(pjsSchema.accountId, pjsSchema.perbill, pjsSchema.u32);
      const [account, perbill, page] = schema.parse(tuple);

      expect(account).toEqual(aliceAccountId);
      expect(perbill.toString()).toEqual('100000000');
      expect(page).toEqual(5);
    });

    it('should compose with storage key schemas', () => {
      const tuple = registry.createType('(u32, u128)', [42, 1000]);

      const schema = pjsSchema.codecTuple(pjsSchema.u32, pjsSchema.u128);

      expect(schema.parse(tuple)).toEqual([42, new BN(1000)]);
    });

    it('should reject non-tuple values', () => {
      const schema = pjsSchema.codecTuple(pjsSchema.u32);

      expect(() => schema.parse(registry.createType('u32', 1))).toThrow();
    });
  });

  describe('btreeMap', () => {
    it('should parse BTreeMap codec into key/value pairs', () => {
      const map = registry.createType('BTreeMap<AccountId32, u32>', new Map([[aliceAddress, 250]]));

      const schema = pjsSchema.btreeMap(pjsSchema.accountId, pjsSchema.u32);
      const result = schema.parse(map);

      expect(result).toEqual([{ key: aliceAccountId, value: 250 }]);
    });

    it('should parse empty BTreeMap', () => {
      const map = registry.createType('BTreeMap<AccountId32, u32>', new Map());

      const schema = pjsSchema.btreeMap(pjsSchema.accountId, pjsSchema.u32);

      expect(schema.parse(map)).toEqual([]);
    });

    it('should reject non-map values', () => {
      const schema = pjsSchema.btreeMap(pjsSchema.accountId, pjsSchema.u32);

      expect(() => schema.parse(registry.createType('u32', 1))).toThrow();
    });
  });

  describe('compact', () => {
    it('should unwrap compact codec and parse inner value', () => {
      const value = registry.createType('Compact<u128>', 5000);

      const schema = pjsSchema.compact(pjsSchema.u128);

      expect(schema.parse(value)).toEqual(new BN(5000));
    });

    it('should reject plain values', () => {
      const schema = pjsSchema.compact(pjsSchema.u128);

      expect(() => schema.parse(registry.createType('u128', 5000))).toThrow();
    });
  });
});
