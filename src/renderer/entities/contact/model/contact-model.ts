import { createEffect, createStore, sample } from 'effector';

import { storageService } from '@shared/api/storage';
import { type Contact, kernelModel } from '@shared/core';
import { splice } from '@shared/lib/utils';

const $contacts = createStore<Contact[]>([]);

const populateContactsFx = createEffect((): Promise<Contact[]> => {
  return storageService.contacts.readAll();
});

const createContactFx = createEffect(async (contact: Omit<Contact, 'id'>): Promise<Contact | undefined> => {
  return storageService.contacts.create(contact);
});

const updateContactFx = createEffect(async ({ id, ...rest }: Contact): Promise<Contact> => {
  await storageService.contacts.update(id, rest);

  return { id, ...rest };
});

const deleteContactFx = createEffect(async (contactId: number): Promise<number> => {
  await storageService.contacts.delete(contactId);

  return contactId;
});

$contacts
  .on(populateContactsFx.doneData, (_, contacts) => {
    return contacts;
  })
  .on(createContactFx.doneData, (state, contact) => {
    return contact ? state.concat(contact) : state;
  })
  .on(deleteContactFx.doneData, (state, contactId) => {
    return state.filter((s) => s.id !== contactId);
  })
  .on(updateContactFx.doneData, (state, contact) => {
    const position = state.findIndex((s) => s.id === contact.id);

    return splice(state, contact, position);
  });

sample({
  clock: kernelModel.events.appStarted,
  target: populateContactsFx,
});

export const contactModel = {
  $contacts,
  effects: {
    createContactFx,
    deleteContactFx,
    updateContactFx,
  },
};
