import { groupBy } from 'lodash';
import { TFunction } from 'react-i18next';

import {
  DerivationValidationError,
  DerivationWithPath,
  ImportedDerivation,
  ImportFileChain,
  ImportFileKey,
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
  KeyType,
  ShardAccount,
} from '@shared/core';
import { chainsService } from '@entities/network';
import { toAccountId } from '@shared/lib/utils';
import { ErrorDetails } from '@features/wallets/ImportKeys/lib/derivation-import-error';

const IMPORT_FILE_VERSION = '1';

export const importKeysUtils = {
  isFileStructureValid,
  getDerivationsFromFile,
  getDerivationError,
  shouldIgnoreDerivation,
  mergeChainDerivations,
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
      const hasChainKeys =
        Array.isArray(value) && value.every((keyObj) => 'key' in keyObj && Array.isArray(keyObj.key));

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
    root: rootAccountId,
  };
}

function shouldIgnoreDerivation(derivation: ImportedDerivation): boolean {
  if (!derivation.derivationPath) return true;

  const isChainParamValid = derivation.chainId && chainsService.getChainById(derivation.chainId as ChainId);
  const isTypeParamValid = derivation.type && Object.values(KeyType).includes(derivation.type as KeyType);
  const isShardedAllowedForType =
    !derivation.sharded || (derivation.type !== KeyType.PUBLIC && derivation.type !== KeyType.HOT);

  return !(isChainParamValid && isTypeParamValid && isShardedAllowedForType);
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

      const groupId = shardsByPath[d.derivationPath]?.length
        ? shardsByPath[d.derivationPath][0].groupId
        : crypto.randomUUID();

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

const DERIVATION_ERROR_LABEL = {
  [DerivationValidationError.INVALID_PATH]: 'dynamicDerivations.importKeys.error.invalidPath',
  [DerivationValidationError.PASSWORD_PATH]: 'dynamicDerivations.importKeys.error.invalidPasswordPath',
  [DerivationValidationError.MISSING_NAME]: 'dynamicDerivations.importKeys.error.missingName',
  [DerivationValidationError.WRONG_SHARDS_NUMBER]: 'dynamicDerivations.importKeys.error.wrongShardsNumber',
};

function getErrorsText(t: TFunction, error: ValidationError, details?: ErrorDetails) {
  switch (error) {
    case ValidationError.INVALID_FILE_STRUCTURE:
      return t('dynamicDerivations.importKeys.error.invalidFile');
    case ValidationError.INVALID_ROOT:
      return t('dynamicDerivations.importKeys.error.invalidRoot');
    case ValidationError.DERIVATIONS_ERROR:
      if (!details) return '';

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
}
