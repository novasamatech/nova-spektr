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

  describe('encodeCallData — convertArgForEncoding via onCall', () => {
    it('should convert enum {variant, values} with no fields to bare variant string', () => {
      let capturedArgs: unknown[] = [];
      const api = createMockApi({
        system: {
          remark: {
            hex: '0x1234',
            onCall: (args: unknown[]) => {
              capturedArgs = args;
            },
          },
        },
      });

      const argDefs = [
        {
          name: 'origin',
          typeDef: {
            kind: 'enum' as const,
            typeName: 'OriginCaller',
            variants: [
              { name: 'System', index: 0, fields: [] },
              { name: 'Council', index: 1, fields: [] },
            ],
          },
        },
      ];

      encodeCallData(api, 'system', 'remark', [{ variant: 'System', values: {} }], argDefs);

      expect(capturedArgs[0]).toBe('System');
    });

    it('should convert enum {variant, values} with single field to {VariantName: value}', () => {
      let capturedArgs: unknown[] = [];
      const api = createMockApi({
        xcm: {
          send: {
            hex: '0xabcd',
            onCall: (args: unknown[]) => {
              capturedArgs = args;
            },
          },
        },
      });

      const argDefs = [
        {
          name: 'dest',
          typeDef: {
            kind: 'enum' as const,
            typeName: 'VersionedLocation',
            variants: [
              {
                name: 'V3',
                index: 0,
                fields: [{ name: 'location', typeDef: { kind: 'primitive' as const, typeName: 'u32' } }],
              },
            ],
          },
        },
      ];

      encodeCallData(api, 'xcm', 'send', [{ variant: 'V3', values: { location: '42' } }], argDefs);

      expect(capturedArgs[0]).toEqual({ V3: '42' });
    });

    it('should convert enum {variant, values} with multiple fields to {VariantName: {field: val}}', () => {
      let capturedArgs: unknown[] = [];
      const api = createMockApi({
        xcm: {
          send: {
            hex: '0xabcd',
            onCall: (args: unknown[]) => {
              capturedArgs = args;
            },
          },
        },
      });

      const argDefs = [
        {
          name: 'dest',
          typeDef: {
            kind: 'enum' as const,
            typeName: 'MultiLocation',
            variants: [
              {
                name: 'V2',
                index: 0,
                fields: [
                  { name: 'parents', typeDef: { kind: 'primitive' as const, typeName: 'u8' } },
                  { name: 'interior', typeDef: { kind: 'primitive' as const, typeName: 'u32' } },
                ],
              },
            ],
          },
        },
      ];

      encodeCallData(api, 'xcm', 'send', [{ variant: 'V2', values: { parents: '1', interior: '0' } }], argDefs);

      expect(capturedArgs[0]).toEqual({ V2: { parents: '1', interior: '0' } });
    });

    it('should convert option {enabled: true, inner} to unwrapped inner value', () => {
      let capturedArgs: unknown[] = [];
      const api = createMockApi({
        staking: {
          nominate: {
            hex: '0x5678',
            onCall: (args: unknown[]) => {
              capturedArgs = args;
            },
          },
        },
      });

      const argDefs = [
        {
          name: 'payee',
          typeDef: {
            kind: 'option' as const,
            typeName: 'Option<AccountId>',
            inner: { kind: 'accountId' as const, typeName: 'AccountId' },
          },
        },
      ];

      encodeCallData(api, 'staking', 'nominate', [{ enabled: true, inner: '5GrwvaEF...' }], argDefs);

      expect(capturedArgs[0]).toBe('5GrwvaEF...');
    });

    it('should convert option {enabled: false} to null', () => {
      let capturedArgs: unknown[] = [];
      const api = createMockApi({
        staking: {
          nominate: {
            hex: '0x5678',
            onCall: (args: unknown[]) => {
              capturedArgs = args;
            },
          },
        },
      });

      const argDefs = [
        {
          name: 'payee',
          typeDef: {
            kind: 'option' as const,
            typeName: 'Option<AccountId>',
            inner: { kind: 'accountId' as const, typeName: 'AccountId' },
          },
        },
      ];

      encodeCallData(api, 'staking', 'nominate', [{ enabled: false, inner: '' }], argDefs);

      expect(capturedArgs[0]).toBeNull();
    });

    it('should convert balance string with precision using formatAmount', () => {
      let capturedArgs: unknown[] = [];
      const api = createMockApi({
        balances: {
          transferKeepAlive: {
            hex: '0x9999',
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

      encodeCallData(api, 'balances', 'transferKeepAlive', ['someAddress', '0.5'], argDefs);

      // "0.5" with precision 10 → "5000000000"
      expect(capturedArgs[0]).toBe('someAddress');
      expect(capturedArgs[1]).toBe('5000000000');
    });

    it('should recursively convert vec items', () => {
      let capturedArgs: unknown[] = [];
      const api = createMockApi({
        utility: {
          batch: {
            hex: '0xaaaa',
            onCall: (args: unknown[]) => {
              capturedArgs = args;
            },
          },
        },
      });

      const argDefs = [
        {
          name: 'calls',
          typeDef: {
            kind: 'vec' as const,
            typeName: 'Vec<Option<u32>>',
            inner: {
              kind: 'option' as const,
              typeName: 'Option<u32>',
              inner: { kind: 'primitive' as const, typeName: 'u32' },
            },
          },
        },
      ];

      encodeCallData(
        api,
        'utility',
        'batch',
        [
          [
            { enabled: true, inner: '1' },
            { enabled: false, inner: '' },
          ],
        ],
        argDefs,
      );

      expect(capturedArgs[0]).toEqual(['1', null]);
    });

    it('should convert struct fields recursively', () => {
      let capturedArgs: unknown[] = [];
      const api = createMockApi({
        democracy: {
          propose: {
            hex: '0xbbbb',
            onCall: (args: unknown[]) => {
              capturedArgs = args;
            },
          },
        },
      });

      const argDefs = [
        {
          name: 'proposal',
          typeDef: {
            kind: 'struct' as const,
            typeName: 'Proposal',
            fields: [
              { name: 'amount', typeDef: { kind: 'balance' as const, typeName: 'BalanceOf' } },
              { name: 'target', typeDef: { kind: 'accountId' as const, typeName: 'AccountId' } },
            ],
          },
        },
      ];

      encodeCallData(api, 'democracy', 'propose', [{ amount: '2.0', target: 'addr' }], argDefs);

      // balance "2.0" with precision 10 → "20000000000"
      expect(capturedArgs[0]).toEqual({ amount: '20000000000', target: 'addr' });
    });

    it('should convert tuple to array with recursively converted items', () => {
      let capturedArgs: unknown[] = [];
      const api = createMockApi({
        test: {
          call: {
            hex: '0xcccc',
            onCall: (args: unknown[]) => {
              capturedArgs = args;
            },
          },
        },
      });

      const argDefs = [
        {
          name: 'pair',
          typeDef: {
            kind: 'tuple' as const,
            typeName: '(u32, BalanceOf)',
            fields: [
              { name: '0', typeDef: { kind: 'primitive' as const, typeName: 'u32' } },
              { name: '1', typeDef: { kind: 'balance' as const, typeName: 'BalanceOf' } },
            ],
          },
        },
      ];

      encodeCallData(api, 'test', 'call', [{ '0': '42', '1': '3.0' }], argDefs);

      // tuple → array; balance "3.0" → "30000000000"
      expect(capturedArgs[0]).toEqual(['42', '30000000000']);
    });
  });

  describe('encodeCallData — convertUnknownArg heuristics (no argDefs)', () => {
    it('should convert enum-like objects without type info', () => {
      let capturedArgs: unknown[] = [];
      const api = createMockApi({
        test: {
          call: {
            hex: '0xdddd',
            onCall: (args: unknown[]) => {
              capturedArgs = args;
            },
          },
        },
      });

      // No argDefs — triggers convertUnknownArg via "unknown" kind fallback
      const argDefs = [{ name: 'val', typeDef: { kind: 'unknown' as const, typeName: 'SomeType' } }];

      encodeCallData(api, 'test', 'call', [{ variant: 'Transfer', values: { dest: 'alice' } }], argDefs);

      expect(capturedArgs[0]).toEqual({ Transfer: 'alice' });
    });

    it('should convert enum-like with no values to bare variant string', () => {
      let capturedArgs: unknown[] = [];
      const api = createMockApi({
        test: {
          call: {
            hex: '0xeeee',
            onCall: (args: unknown[]) => {
              capturedArgs = args;
            },
          },
        },
      });

      const argDefs = [{ name: 'val', typeDef: { kind: 'unknown' as const, typeName: 'X' } }];

      encodeCallData(api, 'test', 'call', [{ variant: 'None', values: {} }], argDefs);

      expect(capturedArgs[0]).toBe('None');
    });

    it('should convert option-like objects in unknown mode', () => {
      let capturedArgs: unknown[] = [];
      const api = createMockApi({
        test: {
          call: {
            hex: '0xffff',
            onCall: (args: unknown[]) => {
              capturedArgs = args;
            },
          },
        },
      });

      const argDefs = [{ name: 'val', typeDef: { kind: 'unknown' as const, typeName: 'Y' } }];

      encodeCallData(api, 'test', 'call', [{ enabled: true, inner: 'hello' }], argDefs);
      expect(capturedArgs[0]).toBe('hello');

      encodeCallData(api, 'test', 'call', [{ enabled: false, inner: 'hello' }], argDefs);
      expect(capturedArgs[0]).toBeNull();
    });

    it('should recursively convert arrays in unknown mode', () => {
      let capturedArgs: unknown[] = [];
      const api = createMockApi({
        test: {
          call: {
            hex: '0x1111',
            onCall: (args: unknown[]) => {
              capturedArgs = args;
            },
          },
        },
      });

      const argDefs = [{ name: 'val', typeDef: { kind: 'unknown' as const, typeName: 'Z' } }];

      encodeCallData(
        api,
        'test',
        'call',
        [
          [
            { variant: 'A', values: {} },
            { variant: 'B', values: { x: 'y' } },
          ],
        ],
        argDefs,
      );

      expect(capturedArgs[0]).toEqual(['A', { B: 'y' }]);
    });

    it('should recursively convert plain objects in unknown mode', () => {
      let capturedArgs: unknown[] = [];
      const api = createMockApi({
        test: {
          call: {
            hex: '0x2222',
            onCall: (args: unknown[]) => {
              capturedArgs = args;
            },
          },
        },
      });

      const argDefs = [{ name: 'val', typeDef: { kind: 'unknown' as const, typeName: 'W' } }];

      encodeCallData(api, 'test', 'call', [{ foo: { variant: 'X', values: {} }, bar: 'plain' }], argDefs);

      expect(capturedArgs[0]).toEqual({ foo: 'X', bar: 'plain' });
    });
  });

  describe('parseCallData — codecToValue', () => {
    it('should parse enum variants with struct inner values wrapped under key "0"', () => {
      // When codecToValue encounters an enum whose inner value is a struct,
      // it should produce { variant: "V4", values: { "0": { field: value } } }
      const api = {
        tx: {},
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
          findMetaCall: () => ({ method: 'send', section: 'xcm' }),
        },
        createType: (_typeName: string, _hex: string) => {
          // Mock a Call codec with one enum arg whose inner is a struct
          const innerStruct = {
            entries: () => [['parents', { toBigInt: () => BigInt(1), toString: () => '1' }]],
            defKeys: ['parents'],
          };

          const enumValue = {
            type: 'V3',
            isV3: true,
            asV3: innerStruct,
            isSome: undefined, // not an Option
          };

          return {
            argsEntries: [['dest', enumValue]],
            callIndex: new Uint8Array([0, 0]),
          };
        },
      } as unknown as ApiPromise;

      // Mock getCallMeta to return args without balance type so no precision conversion
      (api.tx as any).xcm = {
        send: Object.assign((..._args: unknown[]) => ({ method: { toHex: () => '0x' } }), {
          meta: {
            args: [{ name: { toString: () => 'dest' }, type: { toString: () => '20' }, typeName: { isSome: false } }],
            docs: [],
          },
        }),
      };

      const result = parseCallData(api, '0xabcd');

      expect(result).not.toBeNull();
      expect(result!.pallet).toBe('xcm');
      expect(result!.call).toBe('send');
      // The enum struct inner value should be wrapped under key '0'
      expect(result!.args.dest).toEqual({
        variant: 'V3',
        values: { '0': { parents: '1' } },
      });
    });

    it('should correctly reject enums when detecting Vec<u8> (no false positive on complex codec)', () => {
      // An enum like XcmV3Instruction has .type, .toHex(), .length, .map() but
      // its elements have .type (variant indicator) — should NOT be treated as bytes
      const api = {
        tx: {},
        registry: {
          chainDecimals: [10],
          chainTokens: ['DOT'],
          chainSS58: 0,
          lookup: { getSiType: () => null, getName: () => null, getTypeDef: () => null, types: [] },
          createType: () => null,
          findMetaCall: () => ({ method: 'remark', section: 'system' }),
        },
        createType: (_typeName: string, _hex: string) => {
          // Create a mock "array-like" enum value that looks like Vec<u8> at first glance
          const fakeEnumElement = {
            toNumber: () => 5, // in 0-255 range — would pass byte check
            type: 'SomeVariant', // but has .type — should be rejected
            defKeys: undefined,
          };

          const enumArray = Object.assign([fakeEnumElement, fakeEnumElement], {
            toHex: () => '0xfeed',
            map: Array.prototype.map,
            length: 2,
          });

          return {
            argsEntries: [['data', enumArray]],
            callIndex: new Uint8Array([0, 0]),
          };
        },
      } as unknown as ApiPromise;

      (api.tx as any).system = {
        remark: Object.assign((..._args: unknown[]) => ({ method: { toHex: () => '0x' } }), {
          meta: {
            args: [{ name: { toString: () => 'data' }, type: { toString: () => '1' }, typeName: { isSome: false } }],
            docs: [],
          },
        }),
      };

      const result = parseCallData(api, '0x1234');

      expect(result).not.toBeNull();
      // Should NOT be hex bytes — should be parsed as array of enum elements
      const data = result!.args.data;
      expect(data).not.toBe('0xfeed'); // Not treated as bytes
      expect(Array.isArray(data)).toBe(true);
    });

    it('should parse Option values into {enabled, inner} format', () => {
      const api = {
        tx: {},
        registry: {
          chainDecimals: [10],
          chainTokens: ['DOT'],
          chainSS58: 0,
          lookup: { getSiType: () => null, getName: () => null, getTypeDef: () => null, types: [] },
          createType: () => null,
          findMetaCall: () => ({ method: 'setKey', section: 'sudo' }),
        },
        createType: (_typeName: string, _hex: string) => {
          const someOption = {
            isSome: true,
            isNone: false,
            unwrap: () => ({
              toString: () => '5GrwvaEF...',
              constructor: { name: 'GenericAccountId' },
            }),
          };

          const noneOption = {
            isSome: false,
            isNone: true,
          };

          return {
            argsEntries: [
              ['key', someOption],
              ['backup', noneOption],
            ],
            callIndex: new Uint8Array([0, 0]),
          };
        },
      } as unknown as ApiPromise;

      (api.tx as any).sudo = {
        setKey: Object.assign((..._args: unknown[]) => ({ method: { toHex: () => '0x' } }), {
          meta: {
            args: [
              { name: { toString: () => 'key' }, type: { toString: () => '1' }, typeName: { isSome: false } },
              { name: { toString: () => 'backup' }, type: { toString: () => '2' }, typeName: { isSome: false } },
            ],
            docs: [],
          },
        }),
      };

      const result = parseCallData(api, '0xbeef');

      expect(result).not.toBeNull();
      // Some(accountId) → { enabled: true, inner: address_string }
      expect(result!.args.key).toEqual({ enabled: true, inner: '5GrwvaEF...' });
      // None → { enabled: false, inner: '' }
      expect(result!.args.backup).toEqual({ enabled: false, inner: '' });
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
