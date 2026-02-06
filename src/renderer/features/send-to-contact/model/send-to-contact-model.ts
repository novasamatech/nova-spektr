import { createEvent, createStore, sample } from 'effector';

import { type Contact } from '@/shared/core';
import { defaultTransferModel } from '@/widgets/Transfer';

const sendToContactStarted = createEvent<Contact>();
const flowClosed = createEvent();

const $contact = createStore<Contact | null>(null);

sample({
  clock: sendToContactStarted,
  target: $contact,
});

sample({
  clock: flowClosed,
  fn: () => null,
  target: $contact,
});

sample({
  clock: defaultTransferModel.output.flowFinished,
  source: $contact,
  filter: (contact) => contact !== null,
  target: flowClosed,
});

export const sendToContactModel = {
  $contact,

  events: {
    sendToContactStarted,
    flowClosed,
  },
};
