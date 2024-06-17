import groupBy from 'lodash/groupBy';
import unionBy from 'lodash/unionBy';
import { TFunction } from 'react-i18next';

import {
  DerivationValidationError,
  DerivationWithPath,
  ImportedDerivation,
  ImportFileChain,
  ImportFileKey,
  ParsedData,
  ParsedImportFile,
  TypedImportedDerivation,
  ValidationError,
} from './types';
import {
  AccountId,
  AccountType,
  Address,
  ChainAccount,
  ChainId,
  ChainType,
  CryptoType,
  DraftAccount,
  HexString,
  KeyType,
  ShardAccount,
} from '@shared/core';
import { chainsService } from '@shared/api/network';
import { toAccountId } from '@shared/lib/utils';
import { ErrorDetails } from './derivation-import-error';
import { KEY_NAMES, SHARDED_KEY_NAMES } from '@entities/wallet';

const IMPORT_FILE_VERSION = '1';

export const importKeysUtils = {
  isFileStructureValid,
  parseTextFile,
  updateTextStructure,
  getDerivationsFromFile,
  getDerivationError,
  shouldIgnoreDerivation,
  mergeChainDerivations,
  renameDerivationPathKeyReviver,
  getErrorsText,
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

function parseTextFile(fileContent: string): ParsedData | null {
  const lines = fileContent
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const versionMatch = lines[0].match(/^version: (\d+)$/);
  if (!versionMatch || versionMatch[1] !== IMPORT_FILE_VERSION) {
    return null;
  }

  const publicAddressMatch = lines[1].match(/^public address: (0x[a-fA-F0-9]{64})$/);
  if (!publicAddressMatch) return null;
  const key = publicAddressMatch[1];
  const hasPublicKey = key.startsWith('0x') || toAccountId(key) !== '0x00';
  if (!hasPublicKey) return null;

  let currentGenesisHash = '';
  const derivationPaths = [];
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i];
    const genesisHashMatch = line.match(/^hash: (0x[a-fA-F0-9]{64})$/);
    if (genesisHashMatch) {
      const chainId = genesisHashMatch[1];
      if (!chainId.startsWith('0x')) {
        return null;
      }
      currentGenesisHash = genesisHashMatch[1];
    }

    const derivationPathMatch = line.match(/^(\/\/[^\s:]*):\s*([^[]+?)\s*\[([^\]]+)\]$/);
    // To match paths with sharded keys correctly
    const derivationPathShardedMatch = line.match(
      /^(\/\/[^\s:/]*\/\/[^\s:/]*)(?:\/\/0\.\.\.(\d+))?:\s*([^[]+?)\s*\[([^\]]+)\]$/,
    );

    if (derivationPathMatch) {
      const derivationPathParams = {
        derivationPath: derivationPathShardedMatch?.[1] || derivationPathMatch[1],
        sharded: derivationPathShardedMatch?.[2],
        name: derivationPathShardedMatch?.[3] || derivationPathMatch[2],
        type: (derivationPathShardedMatch?.[4] || derivationPathMatch[3]) as KeyType,
        chainId: currentGenesisHash,
      };
      derivationPaths.push(derivationPathParams);
      continue;
    }
  }

  if (derivationPaths.length === 0) return null;

  return {
    version: versionMatch[1],
    publicAddress: key as HexString,
    derivationPaths,
  };
}

function updateTextStructure(parsedData: ParsedData): ParsedImportFile {
  const root = parsedData.publicAddress;

  const importFileChain = parsedData.derivationPaths.reduce<ImportFileChain>((acc, path) => {
    const chainId = path.chainId as ChainId;
    const importFileKey: ImportFileKey = {
      key: {
        derivationPath: path.derivationPath,
        name: path.name,
        type: path.type,
        ...(path.sharded && { sharded: path.sharded }),
      },
    };

    if (!acc[chainId]) {
      acc[chainId] = [];
    }

    acc[chainId].push(importFileKey);

    return acc;
  }, {});

  const result = {
    [root]: importFileChain,
    version: +parsedData.version,
  } as ParsedImportFile;

  return result;
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

function shouldIgnoreDerivation(derivation: ImportedDerivation): boolean {
  if (!derivation.derivationPath) return true;

  const AllKeyTypes = [KeyType.MAIN, KeyType.PUBLIC, KeyType.HOT, KeyType.GOVERNANCE, KeyType.STAKING, KeyType.CUSTOM];

  const isChainParamValid = derivation.chainId && chainsService.getChainById(derivation.chainId as ChainId);
  const isTypeParamValid = derivation.type && Object.values(AllKeyTypes).includes(derivation.type as KeyType);
  const isShardedAllowedForType =
    !derivation.sharded || (derivation.type !== KeyType.PUBLIC && derivation.type !== KeyType.HOT);

  return !isChainParamValid || !isTypeParamValid || !isShardedAllowedForType;
}

function getDerivationError(derivation: DerivationWithPath): DerivationValidationError[] | undefined {
  const errors: DerivationValidationError[] = [];

  const sharded = derivation.sharded && parseInt(derivation.sharded);

  const isShardedParamValid = !sharded || (!isNaN(sharded) && sharded <= 50 && sharded > 1);
  if (!isShardedParamValid) errors.push(DerivationValidationError.WRONG_SHARDS_NUMBER);

  const isPathStartAndEndValid = /^(\/\/|\/)[^/].*[^/]$/.test(derivation.derivationPath);
  if (!isPathStartAndEndValid) errors.push(DerivationValidationError.INVALID_PATH);

  const hasPasswordPath = derivation.derivationPath.includes('///');
  if (hasPasswordPath) errors.push(DerivationValidationError.PASSWORD_PATH);

  const isNameValid = derivation.type !== KeyType.CUSTOM || derivation.name;
  if (!isNameValid) errors.push(DerivationValidationError.MISSING_NAME);

  if (errors.length) return errors;
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
          chainId: d.chainId,
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
          chainId: d.chainId,
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

  const uniqueDerivations = unionBy(importedDerivationsAccounts, 'derivationPath');
  duplicatedKeys += importedDerivationsAccounts.length - uniqueDerivations.length;

  const newDerivationsAccounts = uniqueDerivations.filter((d) => {
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

function renameDerivationPathKeyReviver(key: unknown, value: unknown) {
  if (key === 'derivation_path') {
    // @ts-ignore
    this['derivationPath'] = value;
    // when reviewer function returns undefined property deleted from the object
    // so old key 'derivation_path' is deleted and 'derivationPath' added
  } else {
    return value;
  }
}

const DERIVATION_ERROR_LABEL = {
  [DerivationValidationError.INVALID_PATH]: 'dynamicDerivations.importKeys.error.invalidPath',
  [DerivationValidationError.PASSWORD_PATH]: 'dynamicDerivations.importKeys.error.invalidPasswordPath',
  [DerivationValidationError.MISSING_NAME]: 'dynamicDerivations.importKeys.error.missingName',
  [DerivationValidationError.WRONG_SHARDS_NUMBER]: 'dynamicDerivations.importKeys.error.wrongShardsNumber',
};

function getErrorsText(t: TFunction, error: ValidationError, details?: ErrorDetails): string {
  if (error === ValidationError.INVALID_FILE_STRUCTURE) {
    return t('dynamicDerivations.importKeys.error.invalidFile');
  }
  if (error === ValidationError.INVALID_ROOT) {
    return t('dynamicDerivations.importKeys.error.invalidRoot');
  }

  if (error !== ValidationError.DERIVATIONS_ERROR || !details) return '';

  return Object.keys(details).reduce<string>((acc, error) => {
    const invalidValues = details[error as DerivationValidationError];
    if (!invalidValues.length) return acc;
    const errorText = t(DERIVATION_ERROR_LABEL[error as DerivationValidationError], {
      count: invalidValues.length,
      invalidValues: invalidValues.join(', '),
    });

    return `${acc}${errorText} `;
  }, '');
}
