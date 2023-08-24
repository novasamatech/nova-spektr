import { createEffect, createEvent, createStore, forward } from 'effector';

import { ContactDS } from '@renderer/shared/api/storage';
import { splice } from '@renderer/shared/lib/utils';
import { useContact } from '../lib';
import type { Contact } from './types';

const contactService = useContact();

export const $contacts = createStore<ContactDS[]>([]);
const appStarted = createEvent();

const populateContactsFx = createEffect(() => {
  return contactService.getContacts();
});

const addContactFx = createEffect(async (contact: Contact) => {
  const id = await contactService.addContact(contact);

  return { id, ...contact };
});

const updateContactFx = createEffect(async (contact: Contact) => {
  const id = await contactService.updateContact(contact);

  return { id, ...contact };
});

const deleteContactFx = createEffect((contactId: string) => {
  return contactService.deleteContact(contactId);
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
    const position = state.findIndex((s) => s.id === contact.id);

    return splice(state, contact, position);
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
