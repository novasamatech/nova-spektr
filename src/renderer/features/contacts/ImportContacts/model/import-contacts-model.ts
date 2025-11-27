import { attach, createEffect, createEvent, createStore, sample } from 'effector';

import { type Contact } from '@/shared/core';
import { toAccountId, toAddress } from '@/shared/lib/utils';
import { contactModel } from '@/entities/contact';
import { type AccountIdConflict } from '../lib/types';
import { contactImportUtils } from '../lib/utils';
import { type ContactImport } from '../lib/validation';

type ImportState = 'idle' | 'loading' | 'error' | 'success' | 'conflicts';

const fileSelected = createEvent<File>();
const closeModal = createEvent();
const replaceConflicts = createEvent();
const keepCurrent = createEvent();
const resetState = createEvent();

// Stores for parsed data
const $parsedContacts = createStore<ContactImport[] | null>(null).reset(closeModal, resetState);
const $accountIdConflicts = createStore<AccountIdConflict[]>([]).reset(closeModal, resetState);
const $importedCount = createStore<number>(0).reset(closeModal, resetState);
const $isEmptyList = createStore<boolean>(false).reset(closeModal, resetState);

// Parse file effect - returns ContactImport[] | null, never throws
const parseFileFx = createEffect(contactImportUtils.parseJSON);

// Detect accountId conflicts effect
const detectAccountIdConflictsFx = attach({
  source: contactModel.$contacts,
  mapParams: (contacts: ContactImport[], existingContacts: Contact[]) => ({
    contacts,
    existingContacts,
  }),
  effect: createEffect(({ contacts, existingContacts }: { contacts: ContactImport[]; existingContacts: Contact[] }) =>
    contactImportUtils.detectAccountIdConflicts(contacts, existingContacts),
  ),
});

// Replace all contacts (update existing, create new)
const replaceContactsFx = attach({
  source: contactModel.$contacts,
  mapParams: (contacts: ContactImport[], existingContacts: Contact[]) => ({
    contacts,
    existingContacts,
  }),
  effect: createEffect(
    async ({ contacts, existingContacts }: { contacts: ContactImport[]; existingContacts: Contact[] }) => {
      // Resolve name conflicts (auto-add suffixes)
      const resolved = contactImportUtils.resolveNameConflicts(contacts, existingContacts);

      // Separate into updates and creates based on accountId
      const toUpdate: Contact[] = [];
      const toCreate: Omit<Contact, 'id'>[] = [];

      for (const contact of resolved) {
        const accountId = toAccountId(contact.address);
        const existing = existingContacts.find((c) => c.accountId === accountId);
        if (existing) {
          // Update existing contact (accountId conflict - replace)
          toUpdate.push({
            id: existing.id,
            name: contact.name,
            address: toAddress(contact.address),
            accountId,
          });
        } else {
          // Create new contact
          toCreate.push({
            name: contact.name,
            address: toAddress(contact.address),
            accountId,
          });
        }
      }

      // Execute updates and creates
      if (toUpdate.length > 0) {
        await contactModel.effects.updateContactsFx(toUpdate);
      }
      if (toCreate.length > 0) {
        await contactModel.effects.createContactsFx(toCreate);
      }

      return resolved.length;
    },
  ),
});

// Keep current contacts (only import non-conflicting)
const importNonConflictingFx = attach({
  source: contactModel.$contacts,
  mapParams: (contacts: ContactImport[], existingContacts: Contact[]) => ({
    contacts,
    existingContacts,
  }),
  effect: createEffect(
    async ({ contacts, existingContacts }: { contacts: ContactImport[]; existingContacts: Contact[] }) => {
      // Filter out contacts with accountId conflicts
      const existingAccountIds = new Set(existingContacts.map((c) => c.accountId));
      const nonConflicting = contacts.filter((c) => {
        const accountId = toAccountId(c.address);
        return !existingAccountIds.has(accountId);
      });

      // Resolve name conflicts for non-conflicting contacts
      const resolved = contactImportUtils.resolveNameConflicts(nonConflicting, existingContacts);

      // Create new contacts
      const toCreate: Omit<Contact, 'id'>[] = resolved.map((contact) => ({
        name: contact.name,
        address: toAddress(contact.address),
        accountId: toAccountId(contact.address),
      }));

      if (toCreate.length > 0) {
        await contactModel.effects.createContactsFx(toCreate);
      }

      return toCreate.length;
    },
  ),
});

// Define stores
const $importState = createStore<ImportState>('idle')
  .on(fileSelected, () => 'loading')
  .on(parseFileFx.doneData, (_, result) => {
    if (!result.success) return 'error';
    if (result.data.length === 0) return 'error';
    return 'loading'; // Continue to conflict detection
  })
  .on(detectAccountIdConflictsFx.doneData, (_, conflicts) => {
    return conflicts.length > 0 ? 'conflicts' : 'loading';
  })
  .on([replaceContactsFx.done, importNonConflictingFx.done], () => 'success')
  .reset(closeModal, resetState);

// When file is selected, parse it
sample({
  clock: fileSelected,
  target: parseFileFx,
});

// Store empty list flag
sample({
  clock: parseFileFx.doneData,
  fn: (result) => result.success && result.data.length === 0,
  target: $isEmptyList,
});

// Store parsed contacts and detect accountId conflicts
sample({
  clock: parseFileFx.doneData,
  filter: (result) => result.success && result.data.length > 0,
  fn: (result) => (result.success ? result.data : []),
  target: [$parsedContacts, detectAccountIdConflictsFx],
});

// Store accountId conflicts when detected
sample({
  clock: detectAccountIdConflictsFx.doneData,
  target: $accountIdConflicts,
});

// Create event for when no conflicts detected
const noConflictsDetected = sample({
  clock: detectAccountIdConflictsFx.doneData,
  filter: (conflicts) => conflicts.length === 0,
});

// Import contacts when no conflicts
sample({
  clock: noConflictsDetected,
  source: $parsedContacts,
  fn: (contacts) => contacts || [],
  target: replaceContactsFx,
});

// Replace all contacts when user chooses "Replace"
sample({
  clock: replaceConflicts,
  source: $parsedContacts,
  fn: (contacts) => contacts || [],
  target: replaceContactsFx,
});

// Import only non-conflicting contacts when user chooses "Keep Current"
sample({
  clock: keepCurrent,
  source: $parsedContacts,
  fn: (contacts) => contacts || [],
  target: importNonConflictingFx,
});

// Store imported count after import completes
sample({
  clock: [replaceContactsFx.doneData, importNonConflictingFx.doneData],
  target: $importedCount,
});

export const importContactsModel = {
  $importState,
  $parsedContacts,
  $accountIdConflicts,
  $isEmptyList,
  $importedCount,
  events: {
    fileSelected,
    closeModal,
    replaceConflicts,
    keepCurrent,
    resetState,
  },
  effects: {
    parseFileFx,
    detectAccountIdConflictsFx,
    replaceContactsFx,
    importNonConflictingFx,
  },
};
