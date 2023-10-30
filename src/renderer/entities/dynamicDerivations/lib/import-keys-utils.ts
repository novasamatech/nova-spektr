import { ImportedDerivation, ImportFileChain, ImportFileKey, ParsedImportFile } from './types';
import { AccountId } from '@renderer/shared/core';

const IMPORT_FILE_VERSION = '1';

export const importKeysUtils = {
  isFileStructureValid,
  getDerivationsFromFile,
};

function isFileStructureValid(result: any): result is ParsedImportFile {
  const isVersionValid = 'version' in result && result.version === IMPORT_FILE_VERSION;
  // TODO check for one public key
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
        // @ts-ignore
        acc[propertyName] = propertyValue;

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
