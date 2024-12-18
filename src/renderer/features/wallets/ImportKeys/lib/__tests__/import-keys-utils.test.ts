import { webcrypto } from 'node:crypto';

import { AccountType, type DraftAccount, KeyType, type ShardAccount } from '@/shared/core';
import { importKeysUtils } from '../import-keys-utils';
import { importKeysMocks } from '../mocks/import-keys-utils.mock';

Object.defineProperty(global.self, 'crypto', {
  value: webcrypto,
});

describe('entities/dynamicDerivations/import-keys-utils', () => {
  describe('entities/dynamicDerivations/import-keys-utils/validateDerivation', () => {
    test.each(importKeysMocks.validationTestData)('$testName', ({ derivation, isValid }) => {
      expect(!importKeysUtils.getDerivationError(derivation)).toEqual(isValid);
    });
  });

  describe('entities/dynamicDerivations/import-keys-utils/shouldIgnoreDerivation', () => {
    test.each(importKeysMocks.shouldIgnoreDerivationTestData)('$testName', ({ derivation, shouldIgnore }) => {
      expect(importKeysUtils.shouldIgnoreDerivation(derivation)).toEqual(shouldIgnore);
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
      const { mergedDerivations, added, duplicated } = importKeysUtils.mergeChainDerivations(
        importKeysMocks.existingChainDerivations,
        importedDerivations,
      );

      const shardedDerivations = mergedDerivations.filter((d) => d.type === AccountType.SHARD);
      const newStakingShard = mergedDerivations.find((d) => d.derivationPath === '//polkadot//hot//19');

      expect(shardedDerivations.length).toEqual(20);
      expect(added).toEqual(11);
      expect(duplicated).toEqual(10);
      expect((newStakingShard as DraftAccount<ShardAccount>)?.groupId).toEqual(importKeysMocks.existingShardsGroupId);
    });
  });
});
