import { groupBy } from 'lodash';
import { v4 as uuidv4 } from 'uuid';

import { ImportedDerivation, ImportFileChain, ImportFileKey, ParsedImportFile, TypedImportedDerivation } from './types';
import {
  AccountId,
  AccountType,
  ChainAccount,
  ChainId,
  ChainType,
  CryptoType,
  KeyType,
  ShardAccount,
} from '@shared/core';
import { chainsService } from '@entities/network';
import { RawAccount } from '@/src/renderer/shared/core/types/account';

const IMPORT_FILE_VERSION = '1';

export const importKeysUtils = {
  isFileStructureValid,
  getDerivationsFromFile,
  isDerivationValid,
  mergeChainDerivations,
};

function isFileStructureValid(result: any): result is ParsedImportFile {
  const isVersionValid = 'version' in result && result.version === IMPORT_FILE_VERSION;
  if (!isVersionValid) return false;

  const hasPublicKey = Object.keys(result).every((key) => key.startsWith('0x') || key === 'version');
  if (!hasPublicKey) return false;

  const genesisHashes = Object.values(result).filter((x) => typeof x === 'object') as ImportFileChain[];

  const hasChainsAndKeys = Object.values(genesisHashes).every((hash: ImportFileChain) => {
    return Object.entries(hash).every(([key, value]) => {
      const isChainValid = key.startsWith('0x');
      const hasChainKeys =
        Array.isArray(value) && value.every((keyObj) => 'key' in keyObj && Array.isArray(keyObj.key));

      return isChainValid && hasChainKeys;
    });
  });

  return hasChainsAndKeys;
}

type FormattedResult = { derivations: ImportedDerivation[]; root: AccountId };
function getDerivationsFromFile(fileContent: ParsedImportFile): FormattedResult | undefined {
  const rootAccountId = Object.keys(fileContent).find((key) => key !== 'version');
  if (!rootAccountId) return;

  const chains = fileContent[rootAccountId as AccountId];
  const derivations: ImportedDerivation[] = [];

  Object.entries(chains).forEach(([key, value]) => {
    const chainDerivations = (value as ImportFileKey[]).map((keyObject) => {
      const derivation = keyObject.key.reduce((acc, keyProperty) => {
        const [propertyName, propertyValue] = Object.entries(keyProperty)[0];
        if (propertyName === 'derivation_path') {
          // @ts-ignore
          acc['derivationPath'] = propertyValue;
        } else {
          // @ts-ignore
          acc[propertyName] = propertyValue;
        }

        return acc;
      }, {});

      // @ts-ignore
      derivation['chainId'] = key;

      return derivation;
    });

    derivations.push(...chainDerivations);
  });

  return {
    derivations,
    root: rootAccountId as AccountId,
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
  existingDerivations: RawAccount<ShardAccount | ChainAccount>[],
  importedDerivations: TypedImportedDerivation[],
) {
  let addedKeys = 0;
  let duplicatedKeys = 0;
  const existingDerivationsByPath = groupBy(existingDerivations, 'derivationPath');

  const newDerivations = importedDerivations.filter((d) => {
    const duplicatedDerivation = existingDerivationsByPath[d.derivationPath];

    if (duplicatedDerivation) {
      duplicatedKeys++;
    } else {
      addedKeys += Number(d.sharded) || 1;
    }

    return !duplicatedDerivation;
  });

  const shards = existingDerivations.filter((d) => d.type === AccountType.SHARD) as RawAccount<ShardAccount>[];
  const shardsByPath = groupBy(shards, (d) => d.derivationPath.slice(0, d.derivationPath.lastIndexOf('//')));

  const newDerivationsAccounts = newDerivations.reduce<RawAccount<ShardAccount | ChainAccount>[]>((acc, d) => {
    if (!d.sharded) {
      acc.push({
        name: '', // TODO add name after KEY_NAMES merged
        derivationPath: d.derivationPath,
        chainId: existingDerivations[0].chainId,
        cryptoType: CryptoType.SR25519,
        chainType: ChainType.SUBSTRATE,
        type: AccountType.CHAIN,
        keyType: d.type,
      });

      return acc;
    }

    const shardedPath = d.derivationPath.slice(0, d.derivationPath.lastIndexOf('//'));
    const groupId = shardsByPath[shardedPath]?.length ? shardsByPath[shardedPath][0].groupId : uuidv4();

    for (let i = 0; i < Number(d.sharded); i++) {
      acc.push({
        name: '', // TODO add name after KEY_NAMES merged
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
  }, []);

  const result = [...existingDerivations, ...newDerivationsAccounts];

  return { mergedDerivations: result, added: addedKeys, duplicated: duplicatedKeys };
}
