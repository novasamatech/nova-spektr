import { type ApiPromise } from '@polkadot/api';

import { resolveTypeDef } from '../extrinsicBuilder';

// Helper to build mock SiType definitions
function makeSiType(def: Record<string, any>, path: string[] = []) {
  return {
    path: path.map((p) => ({ toString: () => p })),
    def: {
      isPrimitive: false,
      isComposite: false,
      isVariant: false,
      isSequence: false,
      isArray: false,
      isCompact: false,
      isTuple: false,
      ...def,
    },
  };
}

function createMockApiWithSiTypes(types: Record<number, any>): ApiPromise {
  return {
    tx: {},
    registry: {
      chainDecimals: [10],
      chainTokens: ['DOT'],
      lookup: {
        getSiType: (id: number) => {
          const t = types[id];
          if (!t) throw new Error(`Type ${id} not found`);

          return t;
        },
        getName: (id: number) => types[id]?._name ?? null,
        getTypeDef: () => {
          throw new Error('not implemented');
        },
        types: Object.entries(types).map(([id]) => ({
          id: { toNumber: () => Number(id) },
        })),
      },
    },
  } as unknown as ApiPromise;
}

describe('resolveTypeDef', () => {
  it('should resolve primitive u32', () => {
    const api = createMockApiWithSiTypes({
      1: makeSiType({ isPrimitive: true, asPrimitive: { toString: () => 'U32' } }),
    });

    const result = resolveTypeDef(api, '1');

    expect(result.kind).toBe('primitive');
    expect(result.primitiveType).toBe('u32');
  });

  it('should resolve primitive bool', () => {
    const api = createMockApiWithSiTypes({
      2: makeSiType({ isPrimitive: true, asPrimitive: { toString: () => 'Bool' } }),
    });

    const result = resolveTypeDef(api, '2');

    expect(result.kind).toBe('primitive');
    expect(result.primitiveType).toBe('bool');
  });

  it('should resolve composite as struct', () => {
    const api = createMockApiWithSiTypes({
      10: {
        ...makeSiType({
          isComposite: true,
          asComposite: {
            fields: [
              {
                name: { isSome: true, unwrap: () => ({ toString: () => 'name' }) },
                type: { toString: () => '1' },
              },
            ],
          },
        }),
        _name: 'MyStruct',
      },
      1: makeSiType({ isPrimitive: true, asPrimitive: { toString: () => 'U32' } }),
    });

    const result = resolveTypeDef(api, '10');

    expect(result.kind).toBe('struct');
    expect(result.typeName).toBe('MyStruct');
    expect(result.fields).toHaveLength(1);
    expect(result.fields?.[0]?.name).toBe('name');
    expect(result.fields?.[0]?.typeDef.kind).toBe('primitive');
  });

  it('should resolve variant as enum', () => {
    const api = createMockApiWithSiTypes({
      20: {
        ...makeSiType({
          isVariant: true,
          asVariant: {
            variants: [
              {
                name: { toString: () => 'V3' },
                index: { toNumber: () => 0 },
                fields: [],
              },
              {
                name: { toString: () => 'V4' },
                index: { toNumber: () => 1 },
                fields: [
                  {
                    name: { isSome: true, unwrap: () => ({ toString: () => 'location' }) },
                    type: { toString: () => '1' },
                  },
                ],
              },
            ],
          },
        }),
        _name: 'XcmVersionedLocation',
      },
      1: makeSiType({ isPrimitive: true, asPrimitive: { toString: () => 'U32' } }),
    });

    const result = resolveTypeDef(api, '20');

    expect(result.kind).toBe('enum');
    expect(result.typeName).toBe('XcmVersionedLocation');
    expect(result.variants).toHaveLength(2);
    expect(result.variants?.[0]?.name).toBe('V3');
    expect(result.variants?.[0]?.fields).toHaveLength(0);
    expect(result.variants?.[1]?.name).toBe('V4');
    expect(result.variants?.[1]?.fields).toHaveLength(1);
  });

  it('should resolve sequence<u8> as Bytes', () => {
    const api = createMockApiWithSiTypes({
      30: makeSiType({
        isSequence: true,
        asSequence: { type: { toString: () => '1' } },
      }),
      1: makeSiType({ isPrimitive: true, asPrimitive: { toString: () => 'U8' } }),
    });

    const result = resolveTypeDef(api, '30');

    expect(result.kind).toBe('primitive');
    expect(result.primitiveType).toBe('bytes');
    expect(result.typeName).toBe('Bytes');
  });

  it('should resolve sequence<non-u8> as vec', () => {
    const api = createMockApiWithSiTypes({
      30: makeSiType({
        isSequence: true,
        asSequence: { type: { toString: () => '1' } },
      }),
      1: makeSiType({ isPrimitive: true, asPrimitive: { toString: () => 'U32' } }),
    });

    const result = resolveTypeDef(api, '30');

    expect(result.kind).toBe('vec');
  });

  it('should resolve compact<u128> as balance', () => {
    const api = createMockApiWithSiTypes({
      40: makeSiType({
        isCompact: true,
        asCompact: { type: { toString: () => '1' } },
      }),
      1: makeSiType({ isPrimitive: true, asPrimitive: { toString: () => 'U128' } }),
    });

    const result = resolveTypeDef(api, '40');

    expect(result.kind).toBe('balance');
  });

  it('should resolve compact<u32> as compact (not balance)', () => {
    const api = createMockApiWithSiTypes({
      40: makeSiType({
        isCompact: true,
        asCompact: { type: { toString: () => '1' } },
      }),
      1: makeSiType({ isPrimitive: true, asPrimitive: { toString: () => 'U32' } }),
    });

    const result = resolveTypeDef(api, '40');

    expect(result.kind).toBe('compact');
  });

  it('should resolve tuple type', () => {
    const api = createMockApiWithSiTypes({
      50: makeSiType({
        isTuple: true,
        asTuple: [{ toString: () => '1' }, { toString: () => '2' }],
      }),
      1: makeSiType({ isPrimitive: true, asPrimitive: { toString: () => 'U32' } }),
      2: makeSiType({ isPrimitive: true, asPrimitive: { toString: () => 'Bool' } }),
    });

    const result = resolveTypeDef(api, '50');

    expect(result.kind).toBe('tuple');
    expect(result.fields).toHaveLength(2);
    expect(result.fields?.[0]?.typeDef.primitiveType).toBe('u32');
    expect(result.fields?.[1]?.typeDef.primitiveType).toBe('bool');
  });

  it('should derive name from SiType path when getName returns null', () => {
    const api = createMockApiWithSiTypes({
      60: makeSiType({ isPrimitive: true, asPrimitive: { toString: () => 'U64' } }, [
        'sp_runtime',
        'multiaddress',
        'MultiAddress',
      ]),
    });

    const result = resolveTypeDef(api, '60');

    expect(result.typeName).toBe('MultiAddress');
  });

  it('should return unknown for max depth', () => {
    const api = createMockApiWithSiTypes({});

    const result = resolveTypeDef(api, 'SomeType', 100);

    expect(result.kind).toBe('unknown');
  });

  it('should fallback to inferFromTypeString for type name strings', () => {
    const api = createMockApiWithSiTypes({});

    expect(resolveTypeDef(api, 'bool').kind).toBe('primitive');
    expect(resolveTypeDef(api, 'u128').kind).toBe('primitive');
    expect(resolveTypeDef(api, 'AccountId').kind).toBe('accountId');
  });
});
