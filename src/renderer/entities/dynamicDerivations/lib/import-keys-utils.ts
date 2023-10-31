import { ImportedDerivation, ImportFileChain, ImportFileKey, ParsedImportFile, TypedImportedDerivation } from './types';
import { AccountId, ChainId, KeyType } from '@renderer/shared/core';
import { chainsService } from '@renderer/entities/network';

const IMPORT_FILE_VERSION = '1';

export const importKeysUtils = {
  isFileStructureValid,
  getDerivationsFromFile,
  validateDerivation,
  mergeChainDerivations,
};

function isFileStructureValid(result: any): result is ParsedImportFile {
  const isVersionValid = 'version' in result && result.version === IMPORT_FILE_VERSION;
  const hasPublicKey = Object.keys(result).every((key) => key.startsWith('0x') || key === 'version');

  const genesisHashes = Object.values(result).filter((x) => typeof x === 'object') as ImportFileChain[];
  const hasGenesisHash = Object.values(genesisHashes).every((hash) =>
    Object.keys(hash).every((key) => key.startsWith('0x')),
  );
  const hasKeys = Object.values(genesisHashes).every((hash: ImportFileChain) =>
    Object.values(hash).every(
      (v) => Array.isArray(v) && v.every((keyObj) => 'key' in keyObj && Array.isArray(keyObj.key)),
    ),
  );

  return isVersionValid && hasPublicKey && hasGenesisHash && hasKeys;
}

type FormattedResult = { derivations: ImportedDerivation[]; root: AccountId };
function getDerivationsFromFile(result: ParsedImportFile): FormattedResult | undefined {
  const rootAccountId = Object.keys(result).find((key) => key !== 'version');
  if (!rootAccountId) return;

  const chains = result[rootAccountId as AccountId];
  const derivations: ImportedDerivation[] = [];

  for (const [key, value] of Object.entries(chains)) {
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
  }

  return {
    derivations,
    root: rootAccountId as AccountId,
  };
}

function validateDerivation(derivation: ImportedDerivation): boolean {
  if (!derivation.derivationPath) return false;

  const sharded = derivation.sharded && parseInt(derivation.sharded);

  const isShardedParamValid = !sharded || (!isNaN(sharded) && sharded <= 50 && sharded > 1);
  const isChainParamValid = derivation.chainId && chainsService.getChainById(derivation.chainId as ChainId);
  const isTypeParamValid = derivation.type && Object.values(KeyType).includes(derivation.type as KeyType);
  const isShardedAllowedForType =
    !sharded || (derivation.type !== KeyType.PUBLIC && derivation.type !== KeyType.GOVERNANCE);

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
  existingDerivations: TypedImportedDerivation[],
  importedDerivations: TypedImportedDerivation[],
) {
  let addedKeys = 0;
  let duplicatedKeys = 0;
  const newDerivations = importedDerivations.filter((d) => {
    const alreadyExists = existingDerivations.find(
      (ed) => ed.derivationPath === d.derivationPath && ((!d.sharded && !ed.sharded) || ed.sharded === d.sharded),
    );

    if (!alreadyExists) {
      addedKeys += d.sharded ? d.sharded : 1;
    } else {
      duplicatedKeys += alreadyExists.sharded || 1;
    }

    return !alreadyExists;
  });

  const derivationsToReplace = importedDerivations.filter((d) => {
    const hasDifferentShards = existingDerivations.find(
      (ed) => ed.derivationPath === d.derivationPath && ed.sharded && d.sharded && d.sharded > ed.sharded,
    );

    if (hasDifferentShards && d.sharded && hasDifferentShards.sharded) {
      addedKeys += d.sharded - hasDifferentShards?.sharded;
      duplicatedKeys += hasDifferentShards.sharded;
    }

    return hasDifferentShards;
  });

  const result = [...existingDerivations, ...newDerivations];
  result.forEach((d) => {
    const replacementDerivation = derivationsToReplace.find(
      (x) => x.derivationPath === d.derivationPath && Boolean(x.sharded),
    );
    d.sharded = replacementDerivation?.sharded;
  });

  return { mergedDerivations: result, added: addedKeys, duplicated: duplicatedKeys };
}
