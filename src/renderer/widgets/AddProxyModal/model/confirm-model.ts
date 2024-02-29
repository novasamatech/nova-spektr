import { createEvent } from 'effector';

const formInitiated = createEvent();
const formSubmitted = createEvent();

export const confirmModel = {
  events: {
    formInitiated,
  },

  watch: {
    formSubmitted,
  },
};
