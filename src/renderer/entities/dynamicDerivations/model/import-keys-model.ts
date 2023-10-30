import { createEffect, createEvent, createStore, forward, sample } from 'effector';
import { parse } from 'yaml';

import {
  DerivationImportError,
  ImportError,
  importKeysUtils,
  ParsedImportFile,
} from '@renderer/entities/dynamicDerivations';
import { ImportErrorsLabel } from '@renderer/entities/dynamicDerivations/lib/constants';
import { AccountId, ChainId, KeyType, ObjectValues } from '@renderer/shared/core';
import { chainsService } from '@renderer/entities/network';

const $error = createStore<ImportError | null>(null);
const $root = createStore<AccountId | null>(null);

const fileUploaded = createEvent<string>();
const importOpened = createEvent<AccountId>();

const checkFileStructureFx = createEffect((fileContent: string) => {
  // using default core scheme converts 0x strings into numeric values
  const res = parse(fileContent, { schema: 'failsafe' });
  console.log(res);
  if (importKeysUtils.isFileStructureValid(res)) {
    return res;
  } else {
    throw new DerivationImportError(ImportErrorsLabel.INVALID_FILE_STRUCTURE);
  }
});

const validateDerivationsFx = createEffect((result: ParsedImportFile) => {
  const parsed = importKeysUtils.getDerivationsFromFile(result);
  if (!parsed) {
    // throw file format error
    return;
  }

  const { derivations, root } = parsed;

  if (root !== $root.getState()) {
    throw new DerivationImportError(ImportErrorsLabel.INVALID_ROOT);
  }

  const invalidPaths: string[] = [];

  derivations.forEach((derivation) => {
    const sharded = derivation.sharded && parseInt(derivation.sharded);

    const isShardedParamValid = !sharded || (!isNaN(sharded) && sharded <= 50 && sharded > 1);
    const isChainParamValid = derivation.chainId && chainsService.getChainById(derivation.chainId as ChainId);
    const isTypeParamValid = derivation.type && Object.values(KeyType).includes(derivation.type as KeyType);
    const isSharderAllowedForType =
      !sharded || (derivation.type !== KeyType.PUBLIC && derivation.type !== KeyType.GOVERNANCE);

    const isPathValid = Boolean(derivation.derivationPath);

    if (
      !(
        isChainParamValid &&
        isShardedParamValid &&
        isTypeParamValid &&
        isChainParamValid &&
        isPathValid &&
        isSharderAllowedForType
      )
    ) {
      invalidPaths.push(derivation.derivationPath!);
    }
  });

  if (invalidPaths.length) {
    // throw error with wrong path
  } else {
    // return result
  }
});

forward({ from: importOpened, to: $root });

forward({ from: fileUploaded, to: checkFileStructureFx });

sample({
  source: checkFileStructureFx.fail,
  fn: ({ params, error }) => ({ error: error.message as ObjectValues<typeof ImportErrorsLabel> }),
  target: $error,
});

forward({ from: checkFileStructureFx.doneData, to: validateDerivationsFx });

export const importKeysModel = {
  $error,
  events: {
    fileUploaded,
  },
};
