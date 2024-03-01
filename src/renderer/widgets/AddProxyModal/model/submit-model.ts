import { createEvent } from 'effector';

const formInitiated = createEvent();
const formSubmitted = createEvent();

export const submitModel = {
  events: {
    formInitiated,
  },

  output: {
    formSubmitted,
  },
};
