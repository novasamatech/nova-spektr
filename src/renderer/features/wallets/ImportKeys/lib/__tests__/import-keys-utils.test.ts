import { webcrypto } from 'node:crypto';

import { KeyType } from '@/shared/core';
import { polkadotChain, polkadotChainId } from '@/shared/mocks';
import { importKeysUtils } from '../import-keys-utils';
import { importKeysMocks } from '../mocks/import-keys-utils.mock';

Object.defineProperty(global.self, 'crypto', {
  value: webcrypto,
});

describe('entities/dynamicDerivations/import-keys-utils', () => {
  describe('entities/dynamicDerivations/import-keys-utils/validateDerivation', () => {
    test.each(importKeysMocks.validationTestData)('$testName', ({ derivation, isValid }) => {
      expect(!importKeysUtils.getDerivationError(derivation, {})).toEqual(isValid);
    });
  });

  describe('entities/dynamicDerivations/import-keys-utils/shouldIgnoreDerivation', () => {
    const mockChains = {
      [polkadotChainId]: polkadotChain,
    };
    test.each(importKeysMocks.shouldIgnoreDerivationTestData)('$testName', ({ derivation, shouldIgnore }) => {
      expect(importKeysUtils.shouldIgnoreDerivation(derivation, mockChains)).toEqual(shouldIgnore);
    });
  });

  describe('entities/dynamicDerivations/import-keys-utils/mergeChainDerivations', () => {
    test('should add new derivations', () => {
      const importedDerivations = [
        {
          derivationPath: '//polkadot//hot',
          type: KeyType.HOT,
          chainId: importKeysMocks.chainId,
        },
        {
          derivationPath: '//polkadot//custom//some_other_key',
          type: KeyType.CUSTOM,
          chainId: importKeysMocks.chainId,
        },
      ];
      const { addedDerivations, addedCount, duplicatedCount } = importKeysUtils.mergeChainDerivations(
        importKeysMocks.existingChainDerivations,
        importedDerivations,
      );

      const allPaths = [
        ...importKeysMocks.existingChainDerivations.map((d) => d.derivationPath),
        ...importedDerivations.map((d) => d.derivationPath),
      ];

      const everyKeyInPlace = addedDerivations.every((d) => allPaths.includes(d.derivationPath));

      expect(everyKeyInPlace).toEqual(true);
      expect(addedCount).toEqual(importedDerivations.length);
      expect(duplicatedCount).toEqual(0);
    });

    test('should not duplicate keys', () => {
      const importedDerivations = [
        {
          derivationPath: '//polkadot//hot',
          type: KeyType.HOT,
          chainId: importKeysMocks.chainId,
        },
        {
          derivationPath: '//polkadot',
          type: KeyType.MAIN,
          chainId: importKeysMocks.chainId,
        },
      ];
      const { addedDerivations, addedCount, duplicatedCount } = importKeysUtils.mergeChainDerivations(
        importKeysMocks.existingChainDerivations,
        importedDerivations,
      );

      expect(addedDerivations.length).toEqual(1);
      expect(addedCount).toEqual(1);
      expect(duplicatedCount).toEqual(1);
    });

    test('should merge sharded keys', () => {
      const importedDerivations = [
        {
          derivationPath: '//polkadot//hot',
          type: KeyType.HOT,
          chainId: importKeysMocks.chainId,
          sharded: '20',
        },
        {
          derivationPath: '//polkadot//some_path',
          type: KeyType.CUSTOM,
          chainId: importKeysMocks.chainId,
        },
      ];
      const expectedNewShardedDerivationPaths = [...Array(10).keys()]
        .map((i) => `//polkadot//hot//${i + 10}`)
        .concat('//polkadot//some_path');

      const { addedDerivations, addedCount, duplicatedCount } = importKeysUtils.mergeChainDerivations(
        importKeysMocks.existingChainDerivations,
        importedDerivations,
      );
      const addedShardedDerivationPaths = addedDerivations.map((d) => d.derivationPath);

      expect(addedCount).toEqual(11);
      expect(duplicatedCount).toEqual(10);
      expect(addedShardedDerivationPaths).toEqual(expectedNewShardedDerivationPaths);
    });
  });
});
