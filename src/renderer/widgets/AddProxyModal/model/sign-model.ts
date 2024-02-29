import { createEvent } from 'effector';

const formInitiated = createEvent();
const formSubmitted = createEvent();

export const signModel = {
  events: {
    formInitiated,
  },

  watch: {
    formSubmitted,
  },
};
