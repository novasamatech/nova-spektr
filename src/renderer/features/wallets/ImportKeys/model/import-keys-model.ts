import { createEffect, createEvent, createStore, sample } from 'effector';
import { groupBy } from 'lodash';
import { reset } from 'patronum';

import {
  type Chain,
  type ChainId,
  type DraftAccount,
  type VaultChainAccount,
  type VaultShardAccount,
} from '@/shared/core';
import { entries, toAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { networkModel } from '@/entities/network';
import { PATH_ERRORS } from '../lib/constants';
import { DerivationImportError, type ErrorDetails } from '../lib/derivation-import-error';
import { importKeysUtils } from '../lib/import-keys-utils';
import {
  type DerivationKeyDraft,
  DerivationValidationError,
  type DerivationWithPath,
  type ParsedImportFile,
  type TypedImportedDerivation,
  ValidationError,
} from '../lib/types';

type SampleFnError = { error: DerivationImportError };
type ExistingDerivations = {
  root: AccountId;
  derivations: (DraftAccount<VaultShardAccount> | DraftAccount<VaultChainAccount>)[];
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
const $keysToAdd = createStore<DerivationKeyDraft[]>([]);

const $existingDerivations = createStore<ExistingDerivations | null>(null);

const fileUploaded = createEvent<File>();
const resetValues = createEvent<ExistingDerivations>();

const parseFileContentFx = createEffect<File, ParsedImportFile, DerivationImportError>(async (file: File) => {
  const fileContent = await file.text();
  if (!fileContent) {
    throw new DerivationImportError(ValidationError.INVALID_FILE_STRUCTURE);
  }

  const textStructure = importKeysUtils.parseTextFile(fileContent);
  if (textStructure) {
    return importKeysUtils.updateTextStructure(textStructure);
  }

  const yamlStructure = importKeysUtils.parseYamlFile(fileContent);
  if (yamlStructure) {
    return yamlStructure;
  }

  throw new DerivationImportError(ValidationError.INVALID_FILE_STRUCTURE);
});

type ValidateDerivationsParams = {
  fileContent: ParsedImportFile;
  existingDerivations: ExistingDerivations;
  chains: Record<ChainId, Chain>;
};
const validateDerivationsFx = createEffect<ValidateDerivationsParams, TypedImportedDerivation[], DerivationImportError>(
  ({ fileContent, existingDerivations, chains }) => {
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
      (d) => !importKeysUtils.shouldIgnoreDerivation(d, chains),
    ) as DerivationWithPath[];

    const errorsDetails = filteredDerivations.reduce<ErrorDetails>(
      (acc, derivation) => {
        const errors = importKeysUtils.getDerivationError(derivation, chains);
        if (!errors) return acc;

        for (const err of errors) {
          if (PATH_ERRORS.includes(err)) {
            acc[err].push(derivation.derivationPath!);
          }
          if (err === DerivationValidationError.WRONG_SHARDS_NUMBER) {
            acc[err].push(derivation.sharded || '');
          }
        }

        return acc;
      },
      {
        [DerivationValidationError.INVALID_PATH]: [],
        [DerivationValidationError.PASSWORD_PATH]: [],
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
  derivations: DerivationKeyDraft[];
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

  return entries(importedByChain).reduce<MergeResult>(
    (acc, [chain, derivations]) => {
      const existingChainDerivations = existingByChain[chain];

      const { addedDerivations, addedCount, duplicatedCount } = importKeysUtils.mergeChainDerivations(
        existingChainDerivations || [],
        derivations,
      );

      acc.derivations.push(...addedDerivations);
      acc.report.addedKeys += addedCount;
      acc.report.duplicatedKeys += duplicatedCount;

      if (addedCount) {
        acc.report.updatedNetworks++;
      }

      return acc;
    },
    {
      derivations: [],
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
  target: [$validationError, $keysToAdd, $report],
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
  source: parseFileContentFx.done,
  fn: () => null,
  target: $validationError,
});

sample({
  source: parseFileContentFx.fail,
  fn: ({ error }: SampleFnError) => ({ error: error.error }),
  target: $validationError,
});

sample({
  clock: parseFileContentFx.doneData,
  source: {
    existingDerivations: $existingDerivations,
    chains: networkModel.$chains,
  },
  filter: (_, fileContent) => Boolean(fileContent),
  fn: ({ existingDerivations, chains }, fileContent) => ({
    fileContent,
    existingDerivations: existingDerivations!,
    chains,
  }),
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
  filter: (existingDerivations) => Boolean(existingDerivations),
  fn: (existingDerivations, importedDerivations) => ({ imported: importedDerivations, existing: existingDerivations! }),
  target: mergePathsFx,
});

sample({
  source: mergePathsFx.doneData,
  fn: (result) => result.derivations,
  target: $keysToAdd,
});

sample({
  source: mergePathsFx.doneData,
  fn: (result) => result.report,
  target: $report,
});

export const importKeysModel = {
  $validationError,
  $successReport: $report,
  $keysToAdd,
  events: {
    fileUploaded,
    resetValues,
  },
};
