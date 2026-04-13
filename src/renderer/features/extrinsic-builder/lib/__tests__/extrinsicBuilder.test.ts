import { type ApiPromise } from '@polkadot/api';

import { encodeCallData, getCallMeta, getCallNames, getPalletNames, parseCallData } from '../extrinsicBuilder';

// Helper to create a mock API with tx pallets
function createMockApi(pallets: Record<string, Record<string, any>>): ApiPromise {
  const tx: Record<string, any> = {};

  for (const [palletName, calls] of Object.entries(pallets)) {
    const section: Record<string, any> = {};

    for (const [callName, callConfig] of Object.entries(calls)) {
      const callFn = (...args: unknown[]) => {
        callConfig.onCall?.(args);

        return {
          method: {
            toHex: () => callConfig.hex ?? '0xdead',
          },
        };
      };

      callFn.meta = {
        args: callConfig.args ?? [],
        docs: callConfig.docs ?? [],
      };

      section[callName] = callFn;
    }

    tx[palletName] = section;
  }

  return {
    tx,
    registry: {
      chainDecimals: [10],
      chainTokens: ['DOT'],
      chainSS58: 0,
      lookup: {
        getSiType: () => null,
        getName: () => null,
        getTypeDef: () => null,
        types: [],
      },
      createType: () => null,
      findMetaCall: () => ({ method: 'transfer', section: 'balances' }),
    },
    createType: () => ({
      argsEntries: [],
      callIndex: new Uint8Array([0, 0]),
    }),
  } as unknown as ApiPromise;
}

describe('features/extrinsic-builder/lib/extrinsicBuilder', () => {
  describe('getPalletNames', () => {
    it('should return sorted pallet names', () => {
      const api = createMockApi({
        balances: { transfer: {} },
        system: { remark: {} },
        assets: { mint: {} },
      });

      const result = getPalletNames(api);

      expect(result).toEqual(['assets', 'balances', 'system']);
    });

    it('should filter out pallets with no calls', () => {
      const api = createMockApi({
        balances: { transfer: {} },
        empty: {},
      });

      const result = getPalletNames(api);

      expect(result).toEqual(['balances']);
    });

    it('should return empty array for empty api.tx', () => {
      const api = createMockApi({});

      const result = getPalletNames(api);

      expect(result).toEqual([]);
    });
  });

  describe('getCallNames', () => {
    it('should return sorted call names for a pallet', () => {
      const api = createMockApi({
        balances: {
          transfer: {},
          transferKeepAlive: {},
          forceTransfer: {},
        },
      });

      const result = getCallNames(api, 'balances');

      expect(result).toEqual(['forceTransfer', 'transfer', 'transferKeepAlive']);
    });

    it('should return empty array for non-existent pallet', () => {
      const api = createMockApi({ balances: { transfer: {} } });

      const result = getCallNames(api, 'nonExistent');

      expect(result).toEqual([]);
    });
  });

  describe('getCallMeta', () => {
    it('should return args and docs for a call', () => {
      const mockArgs = [
        {
          name: { toString: () => 'dest' },
          type: { toString: () => 'MultiAddress' },
          typeName: { isSome: false },
        },
        {
          name: { toString: () => 'value' },
          type: { toString: () => 'Compact<u128>' },
          typeName: { isSome: true, unwrap: () => ({ toString: () => 'BalanceOf<T>' }) },
        },
      ];

      const mockDocs = [{ toString: () => 'Transfer some balance.' }];

      const api = createMockApi({
        balances: {
          transfer: { args: mockArgs, docs: mockDocs },
        },
      });

      const result = getCallMeta(api, 'balances', 'transfer');

      expect(result).not.toBeNull();
      expect(result!.args).toHaveLength(2);
      expect(result!.args[0]?.name).toBe('dest');
      expect(result!.args[1]?.name).toBe('value');
      expect(result!.docs).toEqual(['Transfer some balance.']);
    });

    it('should return null for non-existent pallet', () => {
      const api = createMockApi({});

      expect(getCallMeta(api, 'nope', 'call')).toBeNull();
    });

    it('should return null for non-existent call', () => {
      const api = createMockApi({ balances: { transfer: {} } });

      expect(getCallMeta(api, 'balances', 'nope')).toBeNull();
    });

    it('should detect balance type from metadata typeName', () => {
      const mockArgs = [
        {
          name: { toString: () => 'amount' },
          type: { toString: () => 'SomeOpaqueType' },
          typeName: { isSome: true, unwrap: () => ({ toString: () => 'BalanceOf<T>' }) },
        },
      ];

      const api = createMockApi({
        staking: { bond: { args: mockArgs, docs: [] } },
      });

      const result = getCallMeta(api, 'staking', 'bond');

      expect(result!.args[0]?.typeDef.kind).toBe('balance');
    });
  });

  describe('encodeCallData', () => {
    it('should encode call to hex', () => {
      const api = createMockApi({
        balances: { transfer: { hex: '0xabcd' } },
      });

      const result = encodeCallData(api, 'balances', 'transfer', ['dest', '100']);

      expect(result).toBe('0xabcd');
    });

    it('should return null for non-existent pallet', () => {
      const api = createMockApi({});

      expect(encodeCallData(api, 'nope', 'call', [])).toBeNull();
    });

    it('should return null for non-existent call', () => {
      const api = createMockApi({ balances: { transfer: {} } });

      expect(encodeCallData(api, 'balances', 'nope', [])).toBeNull();
    });

    it('should convert balance args using formatAmount', () => {
      let capturedArgs: unknown[] = [];
      const api = createMockApi({
        balances: {
          transfer: {
            hex: '0x1234',
            onCall: (args: unknown[]) => {
              capturedArgs = args;
            },
          },
        },
      });

      const argDefs = [
        { name: 'dest', typeDef: { kind: 'accountId' as const, typeName: 'MultiAddress' } },
        { name: 'value', typeDef: { kind: 'balance' as const, typeName: 'Compact<u128>' } },
      ];

      encodeCallData(api, 'balances', 'transfer', ['address', '1.5'], argDefs);

      // "1.5" with precision 10 should become "15000000000"
      expect(capturedArgs[0]).toBe('address');
      expect(capturedArgs[1]).toBe('15000000000');
    });
  });

  describe('parseCallData', () => {
    it('should return null for invalid hex', () => {
      const api = createMockApi({});

      expect(parseCallData(api, '')).toBeNull();
      expect(parseCallData(api, 'not-hex')).toBeNull();
    });
  });
});
