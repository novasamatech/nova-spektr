import { derivationHasPassword, groupShardedDerivations, validateDerivation } from '@/shared/lib/utils';

describe('shared/lib/onChainUtils/derivation#validateDerivation', () => {
  // Array<[argument, result]>
  const cases: [string, boolean][] = [
    ['//polkadot', true],
    ['/polkadot', true],
    ['//polkadot//sharded//0', true],
    ['//polkadot/mixed//slashes', true],
    ['//abra✨/kadabra🎩/magic🪄/spell🧙', true],
    ['/polkadot/key__type$$-hey-hey/12', true],
    ['/polkadot/\\key__type$$-hey-hey/\\12', true],
    [
      '//abra123/kadabra456/magic789/spell0/wand42/charm99' +
        '/potion77/elixir88/hex33/sigil21//abra123/kadabra456' +
        '/magic789/spell0/wand42/charm99/potion77/elixir88/hex33' +
        '/sigil21//abra123/kadabra456/magic789/spell0/wand42/charm99' +
        '/potion77/elixir88/hex33/sigil21',
      true,
    ],
    ['//', false],
    ['polkadot', false],
    ['//polkadot/', false],
    ['//polkadot//', false],
    [' //polkadot//not_trimmed ', false],
    ['//polkadot///password', false],
    ['//polkadot/key type', false],
    ['//polkadot/key type/12', false],
  ];

  test.each(cases)('should validate "%s" derivation path as "%s"', (firstArg, expectedResult) => {
    const result = validateDerivation(firstArg);
    const isValid = result.length === 0;
    expect(isValid).toEqual(expectedResult);
  });
});

describe('shared/lib/onChainUtils/derivation#derivationHasPassword', () => {
  // Array<[argument, result]>
  const cases: [string, boolean][] = [
    ['/', false],
    ['//', false],
    ['///', true],
    ['/polkadot', false],
    ['//polkadot', false],
    ['///polkadot', true],
    ['/polkadot/1', false],
    ['/polkadot//1', false],
    ['/polkadot///1', true],
  ];

  test.each(cases)('should validate "%s" derivation path with password as "%s"', (firstArg, expectedResult) => {
    const result = derivationHasPassword(firstArg);
    expect(result).toEqual(expectedResult);
  });
});

describe('shared/lib/onChainUtils/derivation#groupShardedDerivations', () => {
  // Array<[input keys, expected groups: { base: string, count: number }[]]>
  const cases: [{ derivationPath: string }[], { base: string; count: number }[]][] = [
    [
      [{ derivationPath: '//polkadot//sharded//0' }, { derivationPath: '//polkadot//sharded//1' }],
      [{ base: '//polkadot//sharded//', count: 2 }],
    ],
    [
      [{ derivationPath: '/polkadot//0' }, { derivationPath: '/polkadot//1' }, { derivationPath: '/polkadot/2' }],
      [{ base: '/polkadot//', count: 2 }],
    ],
    [
      [
        { derivationPath: '//polkadot//sharded//0' },
        { derivationPath: '//polkadot//sharded//1' },
        { derivationPath: '//polkadot//sharded//2' },
      ],
      [{ base: '//polkadot//sharded//', count: 3 }],
    ],
    [
      [
        { derivationPath: '//polkadot//sharded//0' },
        { derivationPath: '//polkadot//sharded//1' },
        { derivationPath: '//polkadot//sharded/1' },
        { derivationPath: '//polkadot//sharded/2' },
        { derivationPath: '//polkadot//sharded/3' },
      ],
      [
        { base: '//polkadot//sharded//', count: 2 },
        { base: '//polkadot//sharded/', count: 3 },
      ],
    ],
    [[{ derivationPath: '//polkadot' }, { derivationPath: '/polkadot' }], []],
    [
      [
        { derivationPath: '//edge//0' },
        { derivationPath: '//edge//00' },
        { derivationPath: '//edge//1a' },
        { derivationPath: '//edge//a1' },
      ],
      [{ base: '//edge//', count: 2 }],
    ],
  ];

  test.each(cases)('should group derivation paths correctly', (inputKeys, expectedGroups) => {
    const groups = groupShardedDerivations(inputKeys);

    // Check all expected groups exist with correct counts
    expectedGroups.forEach(({ base, count }) => {
      expect(groups).toHaveProperty(base);
      expect(groups[base].length).toBe(count);
      for (const key of groups[base]) {
        expect(key.derivationPath.startsWith(base)).toBe(true);
      }
    });

    // Check no unexpected groups exist
    Object.keys(groups).forEach((base) => {
      expect(expectedGroups.map((g) => g.base)).toContain(base);
    });
  });
});
