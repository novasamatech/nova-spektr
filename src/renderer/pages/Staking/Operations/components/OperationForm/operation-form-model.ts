import { createStore, createEvent, sample } from 'effector';

const destinationQueryChanged = createEvent<string>();

const $destinationQuery = createStore<string>('');

sample({ clock: destinationQueryChanged, target: $destinationQuery });

export const operationFormModel = {
  $destinationQuery,
  events: {
    destinationQueryChanged,
  },
};
