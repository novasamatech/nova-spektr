import { type TFunction } from 'i18next';
import groupBy from 'lodash/groupBy';
import unionBy from 'lodash/unionBy';

import { chainsService } from '@/shared/api/network';
import {
  AccountType,
  type Address,
  type ChainId,
  CryptoType,
  type DraftAccount,
  type HexString,
  KeyType,
  SigningType,
  type VaultChainAccount,
  type VaultShardAccount,
} from '@/shared/core';
import { toAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { KEY_NAMES, SHARDED_KEY_NAMES } from '@/entities/wallet';

import { type ErrorDetails } from './derivation-import-error';
import {
  DerivationValidationError,
  type DerivationWithPath,
  type ImportFileChain,
  type ImportFileKey,
  type ImportedDerivation,
  type ParsedData,
  type ParsedImportFile,
  type TypedImportedDerivation,
  ValidationError,
} from './types';

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

function isFileStructureValid(result: unknown): result is ParsedImportFile {
  const isVersionValid =
    result && typeof result === 'object' && 'version' in result && result.version === IMPORT_FILE_VERSION;
  if (!isVersionValid) return false;

  const hasPublicKey = Object.keys(result).every(
    // @ts-expect-error 0x00 is not account id
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

function processString(str: string) {
  const parts = str.split('//');
  const lastPart = parts[parts.length - 1];
  const shardPattern = /^0\.\.\.(\d+)$/;

  const match = lastPart.match(shardPattern);
  if (match) {
    const shard = match[1];
    const processedString = parts.slice(0, -1).join('//');

    return { path: processedString, shard };
  } else {
    return { path: str };
  }
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
  // @ts-expect-error 0x00 is not account id
  const hasPublicKey = key.startsWith('0x') || toAccountId(key) !== '0x00';
  if (!hasPublicKey) return null;

  let currentChainId = '';
  const derivationPaths = [];
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i];
    const chainIdMatch = line.match(/^genesis: (0x[a-fA-F0-9]{64})$/);
    if (chainIdMatch) {
      const chainId = chainIdMatch[1];
      if (!chainId.startsWith('0x')) {
        return null;
      }
      currentChainId = chainIdMatch[1];
    }

    const derivationPathMatch = line.match(/^(\/{1,2}[^\s:]*):\s*([^[]+?)\s*\[([^\]]+)\]$/);

    if (derivationPathMatch) {
      const { path, shard } = processString(derivationPathMatch[1]);

      const derivationPathParams = {
        derivationPath: path,
        sharded: shard,
        name: derivationPathMatch[2],
        type: derivationPathMatch[3] as KeyType,
        chainId: currentChainId,
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
    version: Number(parsedData.version),
  } as ParsedImportFile;

  return result;
}

type FormattedResult = { derivations: ImportedDerivation[]; root: AccountId | Address };
function getDerivationsFromFile(fileContent: ParsedImportFile): FormattedResult | undefined {
  const rootAccountId = Object.keys(fileContent).find((key) => key !== 'version');
  if (!rootAccountId) return;

  const chains = fileContent[rootAccountId as AccountId];
  const derivations: ImportedDerivation[] = [];

  for (const [key, value] of Object.entries(chains)) {
    const chainDerivations = value.map((keyObject) => ({
      ...keyObject.key,
      chainId: key,
    }));

    derivations.push(...chainDerivations);
  }

  return {
    derivations,
    root: rootAccountId,
  };
}

function shouldIgnoreDerivation(derivation: ImportedDerivation): boolean {
  if (!derivation.derivationPath) return true;

  const AllKeyTypes = [KeyType.MAIN, KeyType.PUBLIC, KeyType.HOT, KeyType.CUSTOM];

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

type DraftAccounts = (DraftAccount<VaultShardAccount> | DraftAccount<VaultChainAccount>)[];

function mergeChainDerivations(existingDerivations: DraftAccounts, importedDerivations: TypedImportedDerivation[]) {
  let addedKeys = 0;
  let duplicatedKeys = 0;

  const existingDerivationsByPath = groupBy(existingDerivations, 'derivationPath');
  const shards = existingDerivations.filter((d) => d.accountType === AccountType.SHARD);
  const shardsByPath = groupBy(shards, (d) => d.derivationPath.slice(0, d.derivationPath.lastIndexOf('//')));

  const importedDerivationsAccounts = importedDerivations.reduce<DraftAccounts>((acc, d) => {
    if (!d.sharded) {
      acc.push({
        name: d.name || KEY_NAMES[d.type],
        derivationPath: d.derivationPath,
        chainId: d.chainId,
        cryptoType: CryptoType.SR25519,
        signingType: SigningType.POLKADOT_VAULT,
        accountType: AccountType.CHAIN,
        keyType: d.type,
        type: 'chain',
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
        signingType: SigningType.POLKADOT_VAULT,
        accountType: AccountType.SHARD,
        keyType: d.type,
        groupId,
        type: 'chain',
      });
    }

    return acc;
  }, []);

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
    // @ts-expect-error TODO fix
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
