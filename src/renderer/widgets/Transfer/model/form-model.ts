import { createEvent } from 'effector';

const formSubmitted = createEvent();

export const formModel = {
  outputs: {
    formSubmitted,
  },
};
