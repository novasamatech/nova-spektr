import { KeyType } from '@renderer/shared/core';
import { importKeysUtils } from '../import-keys-utils';
import { ImportedDerivation } from '../types';
import { importKeysMocks } from './mocks/import-keys-utils.mock';

describe('entities/dynamicDerivations/import-keys-utils', () => {
  describe('entities/dynamicDerivations/import-keys-utils/validateDerivation', () => {
    test.each([
      [importKeysMocks.invalidDerivations.passwordPath, false],
      [importKeysMocks.invalidDerivations.invalidPath, false],
      [importKeysMocks.invalidDerivations.emptyPath, false],
      [importKeysMocks.invalidDerivations.tooManyShards, false],
      [importKeysMocks.invalidDerivations.wrongShardedType, false],
      [importKeysMocks.invalidDerivations.wrongKeyType, false],
      [importKeysMocks.validDerivations[0], true],
      [importKeysMocks.validDerivations[1], true],
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
          chainId: importKeysMocks.chainId,
        },
        {
          derivationPath: '//polkadot//staking//some_other_key',
          type: KeyType.STAKING,
          chainId: importKeysMocks.chainId,
        },
      ];
      const { mergedDerivations, added, duplicated } = importKeysUtils.mergeChainDerivations(
        importKeysMocks.existingChainDerivations,
        importedDerivations,
      );

      const allPaths = [
        ...importKeysMocks.existingChainDerivations.map((d) => d.derivationPath),
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
          chainId: importKeysMocks.chainId,
        },
        {
          derivationPath: '//polkadot',
          type: KeyType.MAIN,
          chainId: importKeysMocks.chainId,
        },
      ];
      const { mergedDerivations, added, duplicated } = importKeysUtils.mergeChainDerivations(
        importKeysMocks.existingChainDerivations,
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
          chainId: importKeysMocks.chainId,
          sharded: 20,
        },
        {
          derivationPath: '//polkadot//some_path',
          type: KeyType.CUSTOM,
          chainId: importKeysMocks.chainId,
        },
      ];
      const { mergedDerivations, added, duplicated } = importKeysUtils.mergeChainDerivations(
        importKeysMocks.existingChainDerivations,
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
