import { createEffect, createEvent, createStore, sample } from 'effector';

import { localStorageService } from '@/shared/api/local-storage';
import { governanceMetaProvider } from '@/aggregates/governance-meta-provider';

export const ADD_TO_REGISTRY_KEY = 'add_to_registry';

const modalClosed = createEvent();

const $isModalOpen = createStore<boolean>(true);

const getAddToRegistryModalFx = createEffect(() => {
  return localStorageService.getFromStorage<boolean>(ADD_TO_REGISTRY_KEY, true);
});

const saveAddToRegistryModalFx = createEffect((shown: boolean) => {
  return localStorageService.saveToStorage<boolean>(ADD_TO_REGISTRY_KEY, shown);
});

sample({
  clock: governanceMetaProvider.$metaProvider,
  target: getAddToRegistryModalFx,
});

sample({
  clock: modalClosed,
  fn: () => false,
  target: saveAddToRegistryModalFx,
});

sample({
  clock: [getAddToRegistryModalFx.doneData, saveAddToRegistryModalFx.doneData],
  target: $isModalOpen,
});

export const addToRegistryModel = {
  $isModalOpen,

  events: {
    modalClosed,
  },
};
