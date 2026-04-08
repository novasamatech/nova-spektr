import { createEvent, createStore } from 'effector';
import { persist } from 'effector-storage/local';

export const ADD_TO_REGISTRY_KEY = 'add_to_registry';

const modalClosed = createEvent();

const $isModalOpen = createStore<boolean>(true);

persist({ key: ADD_TO_REGISTRY_KEY, store: $isModalOpen, sync: true });

$isModalOpen.on(modalClosed, () => false);

export const addToRegistryModel = {
  $isModalOpen,

  events: {
    modalClosed,
  },
};
