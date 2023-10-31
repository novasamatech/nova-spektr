import { ChainId, KeyType } from '@renderer/shared/core';
import { ImportedDerivation, importKeysUtils, TypedImportedDerivation } from '@renderer/entities/dynamicDerivations';

const chainId: ChainId = '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3';

const invalidDerivations = {
  passwordPath: {
    derivationPath: '//polkadot///dsfsdf',
    type: KeyType.MAIN,
    chainId: chainId,
  },
  invalidPath: {
    derivationPath: '//polkadot//staking/',
    type: KeyType.MAIN,
    chainId: chainId,
  },
  emptyPath: {
    derivationPath: '',
    type: KeyType.MAIN,
    chainId: chainId,
  },
  tooManyShards: {
    derivationPath: '//path',
    type: KeyType.MAIN,
    chainId: chainId,
    sharded: '60',
  },
  wrongShardedType: {
    derivationPath: '//path',
    type: KeyType.HOT,
    chainId: chainId,
    sharded: '10',
  },
  wrongKeyType: {
    derivationPath: '//path',
    type: 'wrong_type',
    chainId: chainId,
  },
};

const validDerivations = [
  {
    derivationPath: '//polkadot',
    type: KeyType.PUBLIC,
    chainId: chainId,
  },
  {
    derivationPath: '//staking',
    type: KeyType.STAKING,
    chainId: chainId,
    sharded: '10',
  },
];

const existingChainDerivations: TypedImportedDerivation[] = [
  {
    derivationPath: '//polkadot',
    type: KeyType.MAIN,
    chainId: chainId,
  },
  {
    derivationPath: '//polkadot//staking//some_key',
    type: KeyType.STAKING,
    chainId: chainId,
  },
  {
    derivationPath: '//polkadot//staking',
    type: KeyType.STAKING,
    chainId: chainId,
    sharded: 10,
  },
];

describe('entities/dynamicDerivations/import-keys-utils', () => {
  describe('entities/dynamicDerivations/import-keys-utils/validateDerivation', () => {
    test.each([
      [invalidDerivations.passwordPath, false],
      [invalidDerivations.invalidPath, false],
      [invalidDerivations.emptyPath, false],
      [invalidDerivations.tooManyShards, false],
      [invalidDerivations.wrongShardedType, false],
      [invalidDerivations.wrongKeyType, false],
      [validDerivations[0], true],
      [validDerivations[1], true],
    ])('should validate imported derivation', (derivation: ImportedDerivation, expected: boolean) => {
      expect(importKeysUtils.validateDerivation(derivation)).toEqual(expected);
    });
  });

  describe('entities/dynamicDerivations/import-keys-utils/mergeChainDerivations', () => {
    test('should add new derivations', () => {
      const importedDerivations = [
        {
          derivationPath: '//polkadot//gov',
          type: KeyType.GOVERNANCE,
          chainId: chainId,
        },
        {
          derivationPath: '//polkadot//staking//some_other_key',
          type: KeyType.STAKING,
          chainId: chainId,
        },
      ];
      const { mergedDerivations, added, duplicated } = importKeysUtils.mergeChainDerivations(
        existingChainDerivations,
        importedDerivations,
      );

      const allPaths = [
        ...existingChainDerivations.map((d) => d.derivationPath),
        ...importedDerivations.map((d) => d.derivationPath),
      ];

      const everyKeyInPlace = mergedDerivations.every((d) => allPaths.includes(d.derivationPath));

      expect(everyKeyInPlace).toEqual(true);
      expect(added).toEqual(importedDerivations.length);
      expect(duplicated).toEqual(0);
    });

    test('should not duplicate keys', () => {
      const importedDerivations = [
        {
          derivationPath: '//polkadot//gov',
          type: KeyType.GOVERNANCE,
          chainId: chainId,
        },
        {
          derivationPath: '//polkadot',
          type: KeyType.MAIN,
          chainId: chainId,
        },
      ];
      const { mergedDerivations, added, duplicated } = importKeysUtils.mergeChainDerivations(
        existingChainDerivations,
        importedDerivations,
      );

      const polkadotPublicKeys = mergedDerivations.filter((x) => x.derivationPath === '//polkadot');

      expect(polkadotPublicKeys.length).toEqual(1);
      expect(added).toEqual(1);
      expect(duplicated).toEqual(1);
    });

    test('should merge sharded keys', () => {
      const importedDerivations = [
        {
          derivationPath: '//polkadot//staking',
          type: KeyType.STAKING,
          chainId: chainId,
          sharded: 20,
        },
        {
          derivationPath: '//polkadot//some_path',
          type: KeyType.CUSTOM,
          chainId: chainId,
        },
      ];
      const { mergedDerivations, added, duplicated } = importKeysUtils.mergeChainDerivations(
        existingChainDerivations,
        importedDerivations,
      );

      const shardedDerivations = mergedDerivations.filter((d) => d.sharded);

      expect(shardedDerivations.length).toEqual(1);
      expect(shardedDerivations[0].sharded).toEqual(20);
      expect(added).toEqual(11);
      expect(duplicated).toEqual(10);
    });
  });
});
