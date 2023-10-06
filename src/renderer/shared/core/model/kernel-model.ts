import { createEvent } from 'effector';

const appStarted = createEvent();

export const kernelModel = {
  events: {
    appStarted,
  },
};
