import { type TFunction } from 'i18next';
import { t } from 'i18next';
import { groupBy, unionBy } from 'lodash';
import { parse } from 'yaml';

import { type Address, type Chain, type ChainId, type HexString } from '@/shared/core';
import {
  DerivationError,
  UNIVERSAL_GENESIS,
  derivationTokensToString,
  entries,
  nullable,
  parseDerivation,
  toAccountId,
  validateDerivation,
} from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { networkUtils } from '@/entities/network';
import { type VaultDraftAccount } from '@/features/polkadot-vault-wallet';

import { type ErrorDetails } from './derivation-import-error';
import {
  type DerivationKeyDraft,
  type DerivationWithPath,
  type ImportFileChain,
  type ImportFileKey,
  type ImportedDerivation,
  type ParsedData,
  type ParsedImportFile,
  type TypedImportedDerivation,
  DerivationValidationError,
  ValidationError,
} from './types';

const IMPORT_FILE_VERSION = '1';

export const importKeysUtils = {
  isYamlStructureValid,
  parseYamlFile,
  parseTextFile,
  updateTextStructure,
  getDerivationsFromFile,
  getDerivationError,
  shouldIgnoreDerivation,
  mergeChainDerivations,
  renameDerivationPathKeyReviver,
  getErrorsText,
};

function isYamlStructureValid(result: unknown): result is ParsedImportFile {
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
      const isChainValid = key.startsWith('0x') || key === UNIVERSAL_GENESIS;
      const hasChainKeys = Array.isArray(value) && value.every((keyObj) => 'key' in keyObj);

      return isChainValid && hasChainKeys;
    });
  });
}

function parseYamlFile(fileContent: string) {
  let structure: unknown;
  try {
    // using default core scheme converts 0x strings into numeric values
    structure = parse(fileContent, renameDerivationPathKeyReviver, { schema: 'failsafe' });
  } catch {
    return null;
  }
  if (isYamlStructureValid(structure)) {
    return structure;
  }

  return null;
}

function parseTextFile(fileContent: string): ParsedData | null {
  const lines = fileContent
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const versionMatch = lines[0]?.match(/^version: (\d+)$/);
  if (!versionMatch || versionMatch[1] !== IMPORT_FILE_VERSION) {
    return null;
  }

  const publicAddressMatch = lines[1]?.match(/^public address: (0x[a-fA-F0-9]{64})$/);
  if (!publicAddressMatch) return null;
  const key = publicAddressMatch[1];
  // @ts-expect-error 0x00 is not account id
  const hasPublicKey = key.startsWith('0x') || toAccountId(key) !== '0x00';
  if (!hasPublicKey) return null;

  let currentChainId = '';
  const derivationPaths = [];
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i];
    if (line === `genesis: ${UNIVERSAL_GENESIS}`) {
      currentChainId = UNIVERSAL_GENESIS;
      continue;
    }

    const chainIdMatch = line?.match(/^genesis: (0x[a-fA-F0-9]{64})$/);
    if (chainIdMatch) {
      const chainId = chainIdMatch[1];
      if (!chainId?.startsWith('0x')) {
        return null;
      }
      currentChainId = chainIdMatch[1] as string;
    }

    const derivationPathMatch = line?.match(/^(\/{1,2}[^\s:]*)/);

    if (derivationPathMatch) {
      const { tokens, raw, shardCount } = parseDerivation(derivationPathMatch[1] as string);
      const path = shardCount ? derivationTokensToString(tokens.toSpliced(-2)) : raw;

      const derivationPathParams = {
        derivationPath: path,
        sharded: shardCount?.toString(),
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
  if (nullable(chains)) return;

  const derivations: ImportedDerivation[] = [];

  for (const [key, value] of entries(chains)) {
    const chainDerivations = value.map((keyObject) => ({
      ...keyObject.key,
      chainId: key,
    }));

    derivations.push(...chainDerivations);
  }

  return {
    derivations,
    root: toAccountId(rootAccountId),
  };
}

function shouldIgnoreDerivation(derivation: ImportedDerivation, chains: Record<ChainId, Chain>): boolean {
  if (!derivation.derivationPath) return true;
  if (derivation.chainId === UNIVERSAL_GENESIS) return false;

  const isChainParamValid = derivation.chainId && chains[derivation.chainId as ChainId];

  return !isChainParamValid;
}

function getDerivationError(
  derivation: DerivationWithPath,
  chains: Record<ChainId, Chain>,
): DerivationValidationError[] | undefined {
  const errs: DerivationValidationError[] = [];

  const sharded = derivation.sharded && parseInt(derivation.sharded);

  const isShardedParamValid = !sharded || (!isNaN(sharded) && sharded <= 50 && sharded > 1);
  if (!isShardedParamValid) errs.push(DerivationValidationError.WRONG_SHARDS_NUMBER);

  // An unscoped key has no network to take the scheme from — and an Ethereum
  // derivation is inherently network-scoped, so it is always Substrate.
  const derivationChain =
    derivation.chainId && derivation.chainId !== UNIVERSAL_GENESIS ? chains[derivation.chainId as ChainId] : null;
  const isEthereumBased = derivationChain ? networkUtils.isEthereumBased(derivationChain.options) : false;

  const { isValid, errors } = validateDerivation(derivation.derivationPath, { isEthereumBased });

  const hasEthereumSoftError = errors.includes(DerivationError.ETHEREUM_SINGLE_SLASH);
  const hasPasswordPathError = errors.includes(DerivationError.PASSWORD_NOT_SUPPORTED);
  const hasInvalidPathError = !isValid && !hasEthereumSoftError && !hasPasswordPathError;

  if (hasInvalidPathError) errs.push(DerivationValidationError.INVALID_PATH);

  if (hasEthereumSoftError) errs.push(DerivationValidationError.ETHEREUM_SINGLE_SLASH);

  if (hasPasswordPathError) errs.push(DerivationValidationError.PASSWORD_PATH);

  if (errs.length) return errs;
}

type DraftAccounts = VaultDraftAccount[];

const toDraftChainId = (chainId: TypedImportedDerivation['chainId']): ChainId | null =>
  chainId === UNIVERSAL_GENESIS ? null : chainId;

function mergeChainDerivations(existingDerivations: DraftAccounts, importedDerivations: TypedImportedDerivation[]) {
  let addedKeys = 0;
  let duplicatedKeys = 0;

  const importedDerivationsAccounts = importedDerivations.reduce<DerivationKeyDraft[]>((acc, d) => {
    if (!d.sharded) {
      acc.push({
        derivationPath: d.derivationPath,
        chainId: toDraftChainId(d.chainId),
      });

      return acc;
    }

    const groupId = crypto.randomUUID();
    for (let i = 0; i < Number(d.sharded); i++) {
      acc.push({
        derivationPath: d.derivationPath + '//' + i,
        chainId: toDraftChainId(d.chainId),
        groupId,
      });
    }

    return acc;
  }, []);

  const existingDerivationsByPath = groupBy(existingDerivations, 'derivationPath');
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
    addedDerivations: newDerivationsAccounts,
    addedCount: addedKeys,
    duplicatedCount: duplicatedKeys,
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
  [DerivationValidationError.INVALID_PATH]: t('dynamicDerivations.importKeys.error.invalidPath'),
  [DerivationValidationError.ETHEREUM_SINGLE_SLASH]: t('dynamicDerivations.importKeys.error.invalidEthereumPath'),
  [DerivationValidationError.PASSWORD_PATH]: t('dynamicDerivations.importKeys.error.invalidPasswordPath'),
  [DerivationValidationError.WRONG_SHARDS_NUMBER]: t('dynamicDerivations.importKeys.error.wrongShardsNumber'),
};

function getErrorsText(t: TFunction, error: ValidationError, details?: ErrorDetails): string[] {
  if (error === ValidationError.INVALID_FILE_STRUCTURE) {
    return [t('dynamicDerivations.importKeys.error.invalidFile')];
  }
  if (error === ValidationError.INVALID_ROOT) {
    return [t('dynamicDerivations.importKeys.error.invalidRoot')];
  }

  if (error !== ValidationError.DERIVATIONS_ERROR || !details) return [];

  return Object.keys(details).reduce<string[]>((acc, errorKey) => {
    const invalidValues = details[errorKey as DerivationValidationError];
    if (!invalidValues.length) return acc;
    const errorText = t(DERIVATION_ERROR_LABEL[errorKey as DerivationValidationError], {
      count: invalidValues.length,
      invalidValues: invalidValues.join(', '),
    });

    acc.push(errorText);

    return acc;
  }, []);
}
