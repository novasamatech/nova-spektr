import { attach, combine, createEffect, createEvent, createStore, sample } from 'effector';

import { storageService } from '@/shared/api/storage';
import { kernelModel } from '@/shared/core/model/kernel-model';
import { type BackendContact, type Contact, type LocalContact } from '@/shared/core/types/contact';
import { isLocalContact } from '@/shared/core/types/contact';
import { merge, splice } from '@/shared/lib/utils';

// Public events the BackendContacts feature uses to push the connection-scoped backend contact list
// into this entity. Backend contacts are session-scoped and never persisted to Dexie.
const backendContactsReceived = createEvent<BackendContact[]>();
const backendContactsCleared = createEvent();

const $localContacts = createStore<LocalContact[]>([]);
const $backendContacts = createStore<BackendContact[]>([])
  .on(backendContactsReceived, (_, contacts) => contacts)
  .reset(backendContactsCleared);

const $contacts = combine($localContacts, $backendContacts, (local, backend): Contact[] => [...local, ...backend]);

// Loads contacts from Dexie. Backend contacts are session-scoped and never persisted; legacy rows
// from previous app versions are dropped at the schema level by migration-19.
const populateLocalContactsFx = createEffect(async (): Promise<LocalContact[]> => {
  const all = await storageService.contacts.readAll();

  return all.filter(isLocalContact);
});

const createContactFx = createEffect(async (contact: Omit<LocalContact, 'id'>): Promise<LocalContact | undefined> => {
  const full: LocalContact = { ...contact, id: crypto.randomUUID() };

  return storageService.contacts.put(full) as Promise<LocalContact | undefined>;
});

const undoDeleteContactFx = attach({
  source: $localContacts,
  mapParams: (contact: Omit<LocalContact, 'id'>, existingContacts: LocalContact[]) => ({
    contact,
    existingContacts,
  }),
  effect: createEffect(
    async ({
      contact,
      existingContacts,
    }: {
      contact: Omit<LocalContact, 'id'>;
      existingContacts: LocalContact[];
    }): Promise<LocalContact | undefined> => {
      const hasDuplicate = existingContacts.some((c) => c.accountId === contact.accountId);
      if (hasDuplicate) {
        return undefined;
      }
      const full: LocalContact = { ...contact, id: crypto.randomUUID() };

      return storageService.contacts.put(full) as Promise<LocalContact | undefined>;
    },
  ),
});

const createContactsFx = createEffect(
  async (contacts: Omit<LocalContact, 'id'>[]): Promise<LocalContact[] | undefined> => {
    const fullContacts: LocalContact[] = contacts.map((c) => ({ ...c, id: crypto.randomUUID() }));
    await storageService.contacts.insertAll(fullContacts);

    return fullContacts;
  },
);

const updateContactFx = createEffect(async ({ id, ...rest }: LocalContact): Promise<LocalContact> => {
  await storageService.contacts.update(id, rest);

  return { id, ...rest } satisfies LocalContact;
});

const updateContactsFx = createEffect(async (contacts: Contact[]): Promise<LocalContact[]> => {
  const localOnly = contacts.filter(isLocalContact);
  if (localOnly.length === 0) return [];

  await storageService.contacts.updateAll(localOnly);

  return localOnly;
});

const deleteContactFx = createEffect(async (contactId: string): Promise<string> => {
  await storageService.contacts.delete(contactId);

  return contactId;
});

$localContacts
  .on(populateLocalContactsFx.doneData, (_, contacts) => contacts)
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
  });

sample({
  clock: kernelModel.events.appStarted,
  target: populateLocalContactsFx,
});

export const contactModel = {
  $contacts,
  $localContacts,
  $backendContacts,
  events: {
    backendContactsReceived,
    backendContactsCleared,
  },
  effects: {
    createContactFx,
    createContactsFx,
    undoDeleteContactFx,
    deleteContactFx,
    updateContactFx,
    updateContactsFx,
  },
};
