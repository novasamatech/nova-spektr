import { createEffect, createEvent, createStore, forward, sample } from 'effector';
import { parse } from 'yaml';
import { groupBy } from 'lodash';

import { ValidationError, ParsedImportFile, TypedImportedDerivation, ValidationErrorsLabel } from '../lib/types';
import { DerivationImportError } from '../lib/derivation-import-error';
import { AccountId, ChainAccount, ChainId, ObjectValues, ShardAccount } from '@shared/core';
import { importKeysUtils } from '../lib/import-keys-utils';
import { DraftAccount } from '@shared/core/types/account';

type SampleFnError = { error: DerivationImportError };
type ExistingDerivations = {
  root: AccountId;
  derivations: DraftAccount<ShardAccount | ChainAccount>[];
};
type Report = {
  addedKeys: number;
  updatedNetworks: number;
  duplicatedKeys: number;
  ignoredNetworks: ChainId[];
};

const $validationError = createStore<ValidationError | null>(null);
const $report = createStore<Report | null>(null);
const $mergedKeys = createStore<DraftAccount<ShardAccount | ChainAccount>[]>([]);

const $existingDerivations = createStore<ExistingDerivations | null>(null);

const fileUploaded = createEvent<string>();
const resetValues = createEvent<ExistingDerivations>();

const parseFileContentFx = createEffect<string, ParsedImportFile, DerivationImportError>((fileContent: string) => {
  try {
    // using default core scheme converts 0x strings into numeric values
    const structure = parse(fileContent, { schema: 'failsafe' });
    if (importKeysUtils.isFileStructureValid(structure)) return structure;

    throw new DerivationImportError(ValidationErrorsLabel.INVALID_FILE_STRUCTURE);
  } catch {
    throw new DerivationImportError(ValidationErrorsLabel.INVALID_FILE_STRUCTURE);
  }
});

type ValidateDerivationsParams = { fileContent: ParsedImportFile; existingDerivations: ExistingDerivations };
const validateDerivationsFx = createEffect<ValidateDerivationsParams, TypedImportedDerivation[], DerivationImportError>(
  ({ fileContent, existingDerivations }) => {
    const parsed = importKeysUtils.getDerivationsFromFile(fileContent);
    if (!parsed) {
      throw new DerivationImportError(ValidationErrorsLabel.INVALID_FILE_STRUCTURE);
    }

    const { derivations, root } = parsed;

    if (root !== existingDerivations.root) {
      throw new DerivationImportError(ValidationErrorsLabel.INVALID_ROOT);
    }

    const invalidPaths = derivations.reduce<string[]>((acc, derivation) => {
      if (!derivation.derivationPath) {
        throw new DerivationImportError(ValidationErrorsLabel.INVALID_FILE_STRUCTURE);
      }
      if (!importKeysUtils.isDerivationValid(derivation)) {
        acc.push(derivation.derivationPath);
      }

      return acc;
    }, []);

    if (!invalidPaths.length) return derivations as TypedImportedDerivation[];

    if (invalidPaths.every((p) => p.includes('///'))) {
      throw new DerivationImportError(ValidationErrorsLabel.PASSWORD_PATH, invalidPaths);
    } else {
      throw new DerivationImportError(ValidationErrorsLabel.INVALID_PATH, invalidPaths);
    }
  },
);

type MergeResult = {
  derivations: DraftAccount<ShardAccount | ChainAccount>[];
  report: Report;
};
type MergePathsParams = {
  imported: TypedImportedDerivation[];
  existing: ExistingDerivations;
};
const mergePathsFx = createEffect<MergePathsParams, MergeResult>(({ imported, existing }) => {
  const existingDerivations = existing.derivations;

  const existingByChain = groupBy(existingDerivations, 'chainId');
  const importedByChain = groupBy(imported, 'chainId');
  const untouchedDerivations = existingDerivations.filter((d) => !importedByChain[d.chainId]);

  return Object.entries(importedByChain).reduce<MergeResult>(
    (acc, [chain, derivations]) => {
      const existingChainDerivations = existingByChain[chain];
      const { mergedDerivations, added, duplicated } = importKeysUtils.mergeChainDerivations(
        existingChainDerivations,
        derivations,
      );

      acc.derivations.push(...mergedDerivations);
      acc.report.addedKeys += added;
      acc.report.duplicatedKeys += duplicated;

      if (added) {
        acc.report.updatedNetworks++;
      }

      return acc;
    },
    {
      derivations: untouchedDerivations,
      report: {
        addedKeys: 0,
        updatedNetworks: 0,
        duplicatedKeys: 0,
        ignoredNetworks: [],
      },
    },
  );
});

forward({ from: resetValues, to: $existingDerivations });

forward({ from: fileUploaded, to: parseFileContentFx });

sample({
  source: parseFileContentFx.fail,
  fn: ({ error }: SampleFnError) => ({ error: error.message }),
  target: $validationError,
});

sample({
  clock: parseFileContentFx.doneData,
  source: $existingDerivations,
  filter: (existingDerivations, fileContent) => Boolean(fileContent),
  fn: (existingDerivations, fileContent) => ({ fileContent, existingDerivations: existingDerivations! }),
  target: validateDerivationsFx,
});

sample({
  source: validateDerivationsFx.fail,
  fn: ({ error }: SampleFnError) => ({
    error: error.message as ObjectValues<typeof ValidationErrorsLabel>,
    invalidPaths: error.paths,
  }),
  target: $validationError,
});

sample({
  clock: validateDerivationsFx.doneData,
  source: $existingDerivations,
  filter: (existingDerivations, importedDerivations) => Boolean(existingDerivations),
  fn: (existingDerivations, importedDerivations) => ({ imported: importedDerivations, existing: existingDerivations! }),
  target: mergePathsFx,
});

sample({
  source: mergePathsFx.doneData,
  fn: (result) => result.derivations,
  target: $mergedKeys,
});

sample({
  source: mergePathsFx.doneData,
  fn: (result) => result.report,
  target: $report,
});

export const importKeysModel = {
  $validationError,
  $successReport: $report,
  $mergedKeys,
  events: {
    fileUploaded,
    resetValues,
  },
};
