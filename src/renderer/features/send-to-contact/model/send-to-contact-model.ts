import { createEvent, createStore, sample } from 'effector';

import { type Contact } from '@/shared/core';
import { INDEXER_URL } from '@/domains/network';
import { proxiedChainResource } from '@/entities/proxy';
import { defaultTransferModel } from '@/features/transfer';

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

// Fetch proxy chain from indexer for the contact address
sample({
  clock: sendToContactStarted,
  fn: (contact) => ({
    accountId: contact.accountId,
    indexerUrl: INDEXER_URL,
  }),
  target: proxiedChainResource.fetch,
});

export const sendToContactModel = {
  $contact,

  events: {
    sendToContactStarted,
    flowClosed,
  },
};
