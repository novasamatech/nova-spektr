import { createEffect, createEvent, createStore, forward } from 'effector';

import { ContactDS } from '@renderer/shared/api/storage';
import { useContact } from '../lib';
import type { Contact } from './types';

export const $contacts = createStore<ContactDS[]>([]);
const appStarted = createEvent();

const populateContactsFx = createEffect(() => {
  return useContact().getContacts();
});

const addContactFx = createEffect(async (contact: Contact) => {
  const id = await useContact().addContact(contact);

  return { id, ...contact };
});

const updateContactFx = createEffect(async (contact: Contact) => {
  const id = await useContact().updateContact(contact);

  return { id, ...contact };
});

const deleteContactFx = createEffect((contactId: string) => {
  return useContact().deleteContact(contactId);
});

$contacts
  .on(populateContactsFx.doneData, (_, contacts) => {
    return contacts;
  })
  .on(addContactFx.doneData, (state, contact) => {
    return state.concat(contact);
  })
  .on(deleteContactFx.doneData, (state, contactId) => {
    return state.filter((s) => s.id !== contactId);
  })
  .on(updateContactFx.doneData, (state, contact) => {
    const indexOf = state.findIndex((s) => s.id === contact.id);

    return [...state.slice(0, indexOf), contact, ...state.slice(indexOf + 1)];
  });

forward({
  from: appStarted,
  to: populateContactsFx,
});

export const events = {
  appStarted,
};
export const effects = {
  addContactFx,
  deleteContactFx,
  updateContactFx,
};
