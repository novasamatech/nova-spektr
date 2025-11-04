import { createEvent, createStore } from 'effector';

const setFocusedOperationId = createEvent<string | null>();
const $focusedOperationId = createStore<string | null>(null).on(setFocusedOperationId, (_, v) => v);

export const deepLinkModel = {
  $focusedOperationId,
  setFocusedOperationId,
};
