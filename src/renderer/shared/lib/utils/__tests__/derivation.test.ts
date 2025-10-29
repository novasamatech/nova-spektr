import { derivationHasPassword, groupShardedDerivations, validateDerivation } from '@/shared/lib/utils';

describe('validateDerivation - validate substrate derivation paths', () => {
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
    ['//polkadot///multiple//slashes', false],
    ['//polkadot/key type', false],
    ['//polkadot/key type/12', false],
  ];

  test.each(cases)('should validate "%s" derivation path as "%s"', (firstArg, expectedResult) => {
    const result = validateDerivation(firstArg);
    const isValid = result.length === 0;
    expect(isValid).toEqual(expectedResult);
  });
});

describe('validateDerivation - validate ethereum derivation paths', () => {
  const cases: [string, boolean][] = [
    ['//mythos', true],
    ['//mythos//main', true],
    ['//mythos/main', false],
    ['/mythos/main', false],
    ['/mythos//main', false],
    ['//polkadot///password', false],
  ];

  test.each(cases)('should validate "%s" ethereum derivation path as "%s"', (firstArg, expectedResult) => {
    const result = validateDerivation(firstArg, { isEthereum: true });
    const isValid = result.length === 0;
    expect(isValid).toEqual(expectedResult);
  });
});

describe('validateDerivation - validates uniqueness against other paths', () => {
  const cases: [string, boolean][] = [
    ['//polkadot//unique', true],
    ['//polkadot//duplicate', false],
  ];

  const otherPaths = ['//polkadot//duplicate', '//polkadot//duplicate2', '//polkadot//duplicate3'];

  test.each(cases)('should validate "%s" derivation path as "%s"', (firstArg, expectedResult) => {
    const result = validateDerivation(firstArg, { otherPaths });
    const isValid = result.length === 0;
    expect(isValid).toEqual(expectedResult);
  });
});

describe('derivationHasPassword', () => {
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

describe('groupShardedDerivations', () => {
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
