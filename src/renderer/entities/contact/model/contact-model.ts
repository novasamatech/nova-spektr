import { attach, createEffect, createStore, sample } from 'effector';

import { storageService } from '@/shared/api/storage';
import { kernelModel } from '@/shared/core/model/kernel-model';
import { type Contact, type LocalContact } from '@/shared/core/types/contact';
import { isBackendContact, isLocalContact } from '@/shared/core/types/contact';
import { merge, splice } from '@/shared/lib/utils';

const $contacts = createStore<Contact[]>([]);
const $localContacts = $contacts.map((cs) => cs.filter(isLocalContact));
const $backendContacts = $contacts.map((cs) => cs.filter(isBackendContact));

const populateContactsFx = createEffect((): Promise<Contact[]> => {
  return storageService.contacts.readAll();
});

const createContactFx = createEffect(async (contact: Omit<LocalContact, 'id'>): Promise<Contact | undefined> => {
  const full: LocalContact = { ...contact, id: crypto.randomUUID() };

  return storageService.contacts.put(full);
});

const undoDeleteContactFx = attach({
  source: $contacts,
  mapParams: (contact: Omit<LocalContact, 'id'>, existingContacts: Contact[]) => ({
    contact,
    existingContacts,
  }),
  effect: createEffect(
    async ({
      contact,
      existingContacts,
    }: {
      contact: Omit<LocalContact, 'id'>;
      existingContacts: Contact[];
    }): Promise<Contact | undefined> => {
      const hasDuplicate = existingContacts.some((c) => c.accountId === contact.accountId);
      if (hasDuplicate) {
        return undefined;
      }
      const full: LocalContact = { ...contact, id: crypto.randomUUID() };

      return storageService.contacts.put(full);
    },
  ),
});

const createContactsFx = createEffect(async (contacts: Omit<LocalContact, 'id'>[]): Promise<Contact[] | undefined> => {
  const fullContacts: LocalContact[] = contacts.map((c) => ({ ...c, id: crypto.randomUUID() }));
  await storageService.contacts.insertAll(fullContacts);

  return fullContacts;
});

const updateContactFx = createEffect(async ({ id, ...rest }: Contact): Promise<Contact> => {
  await storageService.contacts.update(id, rest);

  return { id, ...rest } satisfies Contact;
});

const updateContactsFx = createEffect(async (contacts: Contact[]): Promise<Contact[]> => {
  if (contacts.length === 0) return [];

  await storageService.contacts.updateAll(contacts);

  return contacts;
});

const deleteContactFx = createEffect(async (contactId: string): Promise<string> => {
  await storageService.contacts.delete(contactId);

  return contactId;
});

const syncBackendContactsFx = createEffect(async (contacts: Contact[]): Promise<Contact[]> => {
  await storageService.contacts.insertAll(contacts);

  return contacts;
});

const clearBackendContactsFx = createEffect(async (): Promise<string[]> => {
  const all = await storageService.contacts.readAll();
  const backendIds = all.filter((c) => c.source === 'backend').map((c) => c.id);
  if (backendIds.length > 0) {
    await storageService.contacts.deleteAll(backendIds);
  }

  return backendIds;
});

$contacts
  .on(populateContactsFx.doneData, (_, contacts) => {
    return contacts;
  })
  .on([createContactFx.doneData, createContactsFx.doneData, undoDeleteContactFx.doneData], (state, contact) => {
    return contact ? state.concat(contact) : state;
  })
  .on(deleteContactFx.doneData, (state, contactId) => {
    return state.filter((s) => s.id !== contactId);
  })
  .on(updateContactFx.doneData, (state, contact) => {
    const position = state.findIndex((s) => s.id === contact.id);

    return splice(state, contact, position);
  })
  .on(updateContactsFx.doneData, (state, contacts) => {
    return merge({
      a: state,
      b: contacts,
      mergeBy: (c) => c.id,
    });
  })
  .on(syncBackendContactsFx.doneData, (state, backendContacts) => {
    const withoutOldBackend: Contact[] = state.filter((c) => c.source !== 'backend');

    return withoutOldBackend.concat(backendContacts);
  })
  .on(clearBackendContactsFx.doneData, (state, deletedIds) => {
    const idSet = new Set(deletedIds);

    return state.filter((c) => !idSet.has(c.id));
  });

sample({
  clock: kernelModel.events.appStarted,
  target: populateContactsFx,
});

export const contactModel = {
  $contacts,
  $localContacts,
  $backendContacts,
  effects: {
    createContactFx,
    createContactsFx,
    undoDeleteContactFx,
    deleteContactFx,
    updateContactFx,
    updateContactsFx,
    syncBackendContactsFx,
    clearBackendContactsFx,
  },
};
