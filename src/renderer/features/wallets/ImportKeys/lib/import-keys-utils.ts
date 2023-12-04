import { groupBy } from 'lodash';

import { ImportedDerivation, ImportFileChain, ImportFileKey, ParsedImportFile, TypedImportedDerivation } from './types';
import {
  AccountId,
  AccountType,
  Address,
  ChainAccount,
  ChainId,
  ChainType,
  CryptoType,
  DraftAccount,
  KeyType,
  ShardAccount,
} from '@shared/core';
import { chainsService } from '@entities/network';
import { toAccountId } from '@shared/lib/utils';
import { KEY_NAMES, SHARDED_KEY_NAMES } from '@entities/wallet';

const IMPORT_FILE_VERSION = '1';

export const importKeysUtils = {
  isFileStructureValid,
  getDerivationsFromFile,
  isDerivationValid,
  mergeChainDerivations,
  renameDerivationPathKey,
};

function isFileStructureValid(result: any): result is ParsedImportFile {
  const isVersionValid = 'version' in result && result.version === IMPORT_FILE_VERSION;
  if (!isVersionValid) return false;

  const hasPublicKey = Object.keys(result).every(
    (key) => key.startsWith('0x') || toAccountId(key) !== '0x00' || key === 'version',
  );
  if (!hasPublicKey) return false;

  const genesisHashes = Object.values(result).filter((x) => typeof x === 'object') as ImportFileChain[];

  return Object.values(genesisHashes).every((hash: ImportFileChain) => {
    return Object.entries(hash).every(([key, value]) => {
      const isChainValid = key.startsWith('0x');
      const hasChainKeys = Array.isArray(value) && value.every((keyObj) => 'key' in keyObj);

      return isChainValid && hasChainKeys;
    });
  });
}

type FormattedResult = { derivations: ImportedDerivation[]; root: AccountId | Address };
function getDerivationsFromFile(fileContent: ParsedImportFile): FormattedResult | undefined {
  const rootAccountId = Object.keys(fileContent).find((key) => key !== 'version');
  if (!rootAccountId) return;

  const chains = fileContent[rootAccountId as AccountId];
  const derivations: ImportedDerivation[] = [];

  Object.entries(chains).forEach(([key, value]) => {
    const chainDerivations = (value as ImportFileKey[]).map((keyObject) => ({
      ...keyObject.key,
      chainId: key,
    }));

    derivations.push(...chainDerivations);
  });

  return {
    derivations,
    root: rootAccountId,
  };
}

function isDerivationValid(derivation: ImportedDerivation): boolean {
  if (!derivation.derivationPath) return false;

  const sharded = derivation.sharded && parseInt(derivation.sharded);

  const isShardedParamValid = !sharded || (!isNaN(sharded) && sharded <= 50 && sharded > 1);
  const isChainParamValid = derivation.chainId && chainsService.getChainById(derivation.chainId as ChainId);
  const isTypeParamValid = derivation.type && Object.values(KeyType).includes(derivation.type as KeyType);
  const isShardedAllowedForType = !sharded || (derivation.type !== KeyType.PUBLIC && derivation.type !== KeyType.HOT);

  const isPathStartAndEndValid = /^(\/\/|\/)[^/].*[^/]$/.test(derivation.derivationPath);
  const hasPasswordPath = derivation.derivationPath.includes('///');
  const isPathValid = isPathStartAndEndValid && !hasPasswordPath;

  return Boolean(
    isChainParamValid &&
      isShardedParamValid &&
      isTypeParamValid &&
      isChainParamValid &&
      isPathValid &&
      isShardedAllowedForType,
  );
}

function mergeChainDerivations(
  existingDerivations: DraftAccount<ShardAccount | ChainAccount>[],
  importedDerivations: TypedImportedDerivation[],
) {
  let addedKeys = 0;
  let duplicatedKeys = 0;

  const existingDerivationsByPath = groupBy(existingDerivations, 'derivationPath');
  const shards = existingDerivations.filter((d) => d.type === AccountType.SHARD) as DraftAccount<ShardAccount>[];
  const shardsByPath = groupBy(shards, (d) => d.derivationPath.slice(0, d.derivationPath.lastIndexOf('//')));

  const importedDerivationsAccounts = importedDerivations.reduce<DraftAccount<ShardAccount | ChainAccount>[]>(
    (acc, d) => {
      if (!d.sharded) {
        acc.push({
          name: d.name || KEY_NAMES[d.type],
          derivationPath: d.derivationPath,
          chainId: existingDerivations[0].chainId,
          cryptoType: CryptoType.SR25519,
          chainType: ChainType.SUBSTRATE,
          type: AccountType.CHAIN,
          keyType: d.type,
        });

        return acc;
      }

      const groupId = shardsByPath[d.derivationPath]?.length
        ? shardsByPath[d.derivationPath][0].groupId
        : crypto.randomUUID();

      for (let i = 0; i < Number(d.sharded); i++) {
        acc.push({
          name: d.name || SHARDED_KEY_NAMES[d.type],
          derivationPath: d.derivationPath + '//' + i,
          chainId: existingDerivations[0].chainId,
          cryptoType: CryptoType.SR25519,
          chainType: ChainType.SUBSTRATE,
          type: AccountType.SHARD,
          keyType: d.type,
          groupId,
        } as ShardAccount);
      }

      return acc;
    },
    [],
  );

  const newDerivationsAccounts = importedDerivationsAccounts.filter((d) => {
    const duplicatedDerivation = existingDerivationsByPath[d.derivationPath];

    if (duplicatedDerivation) {
      duplicatedKeys++;
    } else {
      addedKeys++;
    }

    return !duplicatedDerivation;
  });

  return {
    mergedDerivations: [...existingDerivations, ...newDerivationsAccounts],
    added: addedKeys,
    duplicated: duplicatedKeys,
  };
}

function renameDerivationPathKey(key: unknown, value: unknown) {
  if (key === 'derivation_path') {
    // @ts-ignore
    this.derivationPath = value;
    // when reviewer function returns undefined property deleted from the object
    // so old key 'derivation_path' is deleted and 'derivationPath' added
  } else {
    return value;
  }
}
