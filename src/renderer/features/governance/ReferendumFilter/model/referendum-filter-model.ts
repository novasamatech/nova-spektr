import { createEvent, restore } from 'effector';

const queryChanged = createEvent<string>();

const $query = restore<string>(queryChanged, '');

export const referendumFilterModel = {
  $query,
  events: {
    queryChanged,
  },
};
