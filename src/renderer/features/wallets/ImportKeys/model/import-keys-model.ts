import { createEffect, createEvent, createStore, sample } from 'effector';
import { parse } from 'yaml';
import groupBy from 'lodash/groupBy';
import { reset } from 'patronum';

import {
  DerivationValidationError,
  DerivationWithPath,
  ParsedImportFile,
  TypedImportedDerivation,
  ValidationError,
} from '../lib/types';
import { DerivationImportError, ErrorDetails } from '../lib/derivation-import-error';
import { AccountId, ChainAccount, ChainId, DraftAccount, ShardAccount } from '@shared/core';
import { importKeysUtils } from '../lib/import-keys-utils';
import { toAccountId } from '@shared/lib/utils';
import { PATH_ERRORS } from '../lib/constants';

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
type ErrorsWithDetails = { error: ValidationError; details?: ErrorDetails };

const $validationError = createStore<ErrorsWithDetails | null>(null);
const $report = createStore<Report | null>(null);
const $mergedKeys = createStore<DraftAccount<ShardAccount | ChainAccount>[]>([]);

const $existingDerivations = createStore<ExistingDerivations | null>(null);

const fileUploaded = createEvent<File>();
const resetValues = createEvent<ExistingDerivations>();

const parseFileContentFx = createEffect<File, ParsedImportFile, DerivationImportError>(async (file: File) => {
  let structure: unknown;
  const fileContent = await file.text();

  if (file.type === 'text/plain') {
    const textStructure = importKeysUtils.parseTextFile(fileContent);
    if (!textStructure) throw new DerivationImportError(ValidationError.INVALID_FILE_STRUCTURE);

    return importKeysUtils.updateTextStructure(textStructure);
  }

  try {
    // using default core scheme converts 0x strings into numeric values
    structure = parse(fileContent, importKeysUtils.renameDerivationPathKeyReviver, { schema: 'failsafe' });
  } catch {
    throw new DerivationImportError(ValidationError.INVALID_FILE_STRUCTURE);
  }
  if (importKeysUtils.isFileStructureValid(structure)) return structure;

  throw new DerivationImportError(ValidationError.INVALID_FILE_STRUCTURE);
});

type ValidateDerivationsParams = { fileContent: ParsedImportFile; existingDerivations: ExistingDerivations };
const validateDerivationsFx = createEffect<ValidateDerivationsParams, TypedImportedDerivation[], DerivationImportError>(
  ({ fileContent, existingDerivations }) => {
    const parsed = importKeysUtils.getDerivationsFromFile(fileContent);
    if (!parsed) {
      throw new DerivationImportError(ValidationError.INVALID_FILE_STRUCTURE);
    }

    const { derivations, root } = parsed;
    const rootAccountId = root.startsWith('0x') ? root : toAccountId(root);

    if (rootAccountId !== existingDerivations.root) {
      throw new DerivationImportError(ValidationError.INVALID_ROOT);
    }

    const filteredDerivations = derivations.filter(
      (d) => !importKeysUtils.shouldIgnoreDerivation(d),
    ) as DerivationWithPath[];

    const errorsDetails = filteredDerivations.reduce<ErrorDetails>(
      (acc, derivation) => {
        const errors = importKeysUtils.getDerivationError(derivation);
        if (!errors) return acc;

        errors.forEach((err) => {
          if (PATH_ERRORS.includes(err)) {
            acc[err].push(derivation.derivationPath!);
          }
          if (err === DerivationValidationError.WRONG_SHARDS_NUMBER) {
            acc[err].push(derivation.sharded || '');
          }
        });

        return acc;
      },
      {
        [DerivationValidationError.INVALID_PATH]: [],
        [DerivationValidationError.PASSWORD_PATH]: [],
        [DerivationValidationError.MISSING_NAME]: [],
        [DerivationValidationError.WRONG_SHARDS_NUMBER]: [],
      },
    );

    if (Object.values(errorsDetails).every((details) => !details.length)) {
      return filteredDerivations as TypedImportedDerivation[];
    }

    throw new DerivationImportError(ValidationError.DERIVATIONS_ERROR, errorsDetails);
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
        existingChainDerivations || [],
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

reset({
  clock: resetValues,
  target: [$validationError, $mergedKeys, $report],
});

sample({
  clock: resetValues,
  target: $existingDerivations,
});

sample({
  clock: fileUploaded,
  filter: (file) => Boolean(file),
  target: parseFileContentFx,
});

sample({
  source: parseFileContentFx.fail,
  fn: ({ error }: SampleFnError) => ({ error: error.error }),
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
    error: error.error,
    details: error.errorDetails,
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
