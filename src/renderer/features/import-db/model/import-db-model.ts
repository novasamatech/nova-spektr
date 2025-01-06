import { createEffect, createEvent, createStore, restore, sample } from 'effector';
import { delay } from 'patronum';

import { importDb } from '@/shared/api/storage';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { Paths } from '@/shared/routes';
import { walletModel } from '@/entities/wallet';
import { navigationModel } from '@/features/navigation';
import { isFileValid } from '../utils/utils';

const fileUploaded = createEvent<File>();
const importDatabase = createEvent<File>();
const resetValues = createEvent();

const $validationError = createStore<string | null>(null).reset(resetValues);

const parseFileContentFx = createEffect(async (file: File) => {
  const fileContent = await file.text();

  if (!isFileValid(fileContent)) {
    throw new Error('importDB.errors.invalidStructure');
  }

  return file;
});

const updateDBFx = createEffect(async (file: File) => {
  importDb(file);
});

const $file = restore(parseFileContentFx.doneData, null).reset(resetValues);

sample({
  clock: fileUploaded,
  filter: nonNullable,
  target: parseFileContentFx,
});

sample({
  clock: parseFileContentFx.fail,
  fn: ({ error }) => error.message,
  target: $validationError,
});

sample({
  clock: importDatabase,
  source: $validationError,
  filter: (error) => nullable(error),
  fn: (_, file) => file,
  target: updateDBFx,
});

sample({
  clock: delay(updateDBFx.doneData, 1000),
  target: walletModel.events.walletStarted,
});

sample({
  clock: walletModel.$activeWallet,
  filter: nonNullable,
  fn: () => Paths.ASSETS,
  target: navigationModel.events.navigateTo,
});

export const importDbModel = {
  $validationError,
  $file,

  events: {
    fileUploaded,
    importDatabase,
    resetValues,
  },
};
