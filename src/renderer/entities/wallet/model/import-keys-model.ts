import { createEffect, createEvent, createStore, forward, sample } from 'effector';
import { parse } from 'yaml';
import { groupBy } from 'lodash';

import {
  DerivationImportError,
  ImportError,
  ParsedImportFile,
  TypedImportedDerivation,
  ImportErrorsLabel,
} from '../lib/types';
import { AccountId, ChainId, ObjectValues } from '@renderer/shared/core';
import { importKeysUtils } from '../lib/import-keys-utils';

type SampleFnError = { error: DerivationImportError };
type ExistingDerivations = {
  root: AccountId;
  derivations: TypedImportedDerivation[];
};
type KeysImportReport = {
  addedKeys: number;
  updatedNetworks: number;
  duplicatedKeys: number;
  ignoredNetworks: ChainId[];
};
type MergeResult = { derivations: TypedImportedDerivation[]; report: KeysImportReport };

const $validationError = createStore<ImportError | null>(null);
const $successReport = createStore<KeysImportReport | null>(null);
const $mergedKeys = createStore<TypedImportedDerivation[]>([]);

const $existingDerivations = createStore<ExistingDerivations | null>(null);

const fileUploaded = createEvent<string>();
const importStarted = createEvent<ExistingDerivations>();

const checkFileStructureFx = createEffect<string, ParsedImportFile, DerivationImportError>((fileContent: string) => {
  // using default core scheme converts 0x strings into numeric values
  const res = parse(fileContent, { schema: 'failsafe' });
  if (importKeysUtils.isFileStructureValid(res)) {
    return res;
  } else {
    throw new DerivationImportError(ImportErrorsLabel.INVALID_FILE_STRUCTURE);
  }
});

const validateDerivationsFx = createEffect<ParsedImportFile, TypedImportedDerivation[], DerivationImportError>(
  (result: ParsedImportFile) => {
    const parsed = importKeysUtils.getDerivationsFromFile(result);
    if (!parsed) {
      throw new DerivationImportError(ImportErrorsLabel.INVALID_FILE_STRUCTURE);
    }

    const { derivations, root } = parsed;

    if (root !== $existingDerivations.getState()?.root) {
      throw new DerivationImportError(ImportErrorsLabel.INVALID_ROOT);
    }

    const invalidPaths: string[] = [];

    derivations.forEach((derivation) => {
      if (!derivation.derivationPath) {
        throw new DerivationImportError(ImportErrorsLabel.INVALID_FILE_STRUCTURE);
      }
      if (!importKeysUtils.validateDerivation(derivation)) {
        invalidPaths.push(derivation.derivationPath);
      }
    });

    if (invalidPaths.length) {
      if (invalidPaths.every((p) => p.includes('///'))) {
        throw new DerivationImportError(ImportErrorsLabel.PASSWORD_PATH, invalidPaths);
      } else {
        throw new DerivationImportError(ImportErrorsLabel.INVALID_PATH, invalidPaths);
      }
    } else {
      return derivations as TypedImportedDerivation[];
    }
  },
);

const mergePathsFx = createEffect((imported: TypedImportedDerivation[]): MergeResult | undefined => {
  const mergeReport: KeysImportReport = {
    addedKeys: 0,
    updatedNetworks: 0,
    duplicatedKeys: 0,
    ignoredNetworks: [],
  };
  const mergeResult: TypedImportedDerivation[] = [];

  const existingDerivations = $existingDerivations.getState()?.derivations;
  if (!existingDerivations?.length) return;

  const existingByChain = groupBy(existingDerivations, 'chainId');
  const importedByChain = groupBy(imported, 'chainId');

  for (const [chain, derivations] of Object.entries(importedByChain)) {
    const existingChainDerivations = existingByChain[chain];
    const { mergedDerivations, added, duplicated } = importKeysUtils.mergeChainDerivations(
      existingChainDerivations,
      derivations,
    );

    mergeResult.push(...mergedDerivations);
    mergeReport.addedKeys += added;
    mergeReport.duplicatedKeys += duplicated;

    if (added) {
      mergeReport.updatedNetworks++;
    }
  }

  return { derivations: mergeResult, report: mergeReport };
});

forward({ from: importStarted, to: $existingDerivations });

forward({ from: fileUploaded, to: checkFileStructureFx });

sample({
  source: checkFileStructureFx.fail,
  fn: ({ error }: SampleFnError) => ({ error: error.message }),
  target: $validationError,
});

forward({ from: checkFileStructureFx.doneData, to: validateDerivationsFx });

sample({
  source: validateDerivationsFx.fail,
  fn: ({ error }: SampleFnError) => ({
    error: error.message as ObjectValues<typeof ImportErrorsLabel>,
    tArgs: { count: error.paths?.length, invalidPath: error.paths?.join(', ') },
  }),
  target: $validationError,
});

forward({ from: validateDerivationsFx.doneData, to: mergePathsFx });

sample({
  source: mergePathsFx.doneData,
  fn: (result) => result?.derivations || [],
  target: $mergedKeys,
});

sample({
  source: mergePathsFx.doneData,
  fn: (result) => result?.report || null,
  target: $successReport,
});

export const importKeysModel = {
  $validationError,
  $successReport,
  $mergedKeys,
  events: {
    fileUploaded,
    importStarted,
  },
};
