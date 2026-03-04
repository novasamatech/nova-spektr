import { attach, createEffect, createEvent, createStore, sample } from 'effector';

import { type Contact, type LocalContact } from '@/shared/core';
import { toAccountId, toAddress } from '@/shared/lib/utils';
import { contactModel } from '@/entities/contact';
import { type ImportState } from '../lib/types';
import { contactImportUtils } from '../lib/utils';
import { type ContactImport } from '../lib/validation';

const fileSelected = createEvent<File>();
const closeModal = createEvent();
const replaceConflicts = createEvent();
const keepCurrent = createEvent();
const resetState = createEvent();

const IDLE: ImportState = { status: 'idle' };

const $importState = createStore<ImportState>(IDLE).reset(closeModal, resetState);

const $selectedFile = createStore<File | null>(null).reset(closeModal, resetState);

// Validate file size effect
const MAX_FILE_SIZE = 1024 * 1024; // 1MB in bytes
const validateFileSizeFx = createEffect((file: File) => {
  return file.size <= MAX_FILE_SIZE;
});

// Parse file effect - returns ContactImport[] | null, never throws
const parseFileFx = createEffect(contactImportUtils.parseJSON);

// Detect accountId conflicts effect
const detectAccountIdConflictsFx = attach({
  source: contactModel.$localContacts,
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
  source: contactModel.$localContacts,
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
      const toCreate: Omit<LocalContact, 'id'>[] = [];

      for (const contact of resolved) {
        const accountId = toAccountId(contact.address);
        const existing = existingContacts.find((c) => c.accountId === accountId);
        if (existing) {
          // Update existing contact (accountId conflict - replace)
          toUpdate.push({
            ...existing,
            name: contact.name,
            address: toAddress(contact.address),
            accountId,
          } as Contact);
        } else {
          // Create new contact
          toCreate.push({
            name: contact.name,
            address: toAddress(contact.address),
            accountId,
            source: 'local',
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

const importNonConflictingFx = attach({
  source: contactModel.$localContacts,
  mapParams: (contacts: ContactImport[], existingContacts: Contact[]) => ({
    contacts,
    existingContacts,
  }),
  effect: createEffect(
    async ({ contacts, existingContacts }: { contacts: ContactImport[]; existingContacts: Contact[] }) => {
      const existingAccountIds = new Set(existingContacts.map((c) => c.accountId));
      const nonConflicting = contacts.filter((c) => {
        const accountId = toAccountId(c.address);
        return !existingAccountIds.has(accountId);
      });

      const resolved = contactImportUtils.resolveNameConflicts(nonConflicting, existingContacts);

      const toCreate: Omit<LocalContact, 'id'>[] = resolved.map((contact) => ({
        name: contact.name,
        address: toAddress(contact.address),
        accountId: toAccountId(contact.address),
        source: 'local' as const,
      }));

      if (toCreate.length > 0) {
        await contactModel.effects.createContactsFx(toCreate);
      }

      return toCreate.length;
    },
  ),
});

// State transitions
$importState
  .on(fileSelected, () => ({ status: 'loading' }) satisfies ImportState)
  .on(validateFileSizeFx.doneData, (state, isValid) => {
    if (!isValid) return { status: 'error', reason: 'fileTooLarge' } satisfies ImportState;

    return state;
  })
  .on(parseFileFx.doneData, (state, result) => {
    if (!result.success) return { status: 'error', reason: 'parseError' } satisfies ImportState;
    if (result.data.length === 0) return { status: 'error', reason: 'emptyList' } satisfies ImportState;

    return state;
  })
  .on(detectAccountIdConflictsFx.doneData, (state, conflicts) => {
    if (conflicts.length > 0 && state.status === 'loading') {
      // We need parsed contacts from the store — they'll be set via the sample below
      return state;
    }

    return { status: 'importing' } satisfies ImportState;
  })
  .on([replaceConflicts, keepCurrent], (state) => {
    if (state.status === 'conflicts') return { status: 'importing' } satisfies ImportState;

    return state;
  })
  .on(replaceContactsFx.doneData, (_, importedCount) => ({ status: 'success', importedCount }) satisfies ImportState)
  .on(
    importNonConflictingFx.doneData,
    (_, importedCount) =>
      ({
        status: 'success',
        importedCount,
      }) satisfies ImportState,
  );

// Store selected file
$selectedFile.on(fileSelected, (_, file) => file);

// When file is selected, validate size first
sample({
  clock: fileSelected,
  target: validateFileSizeFx,
});

// Parse file only if size is valid
sample({
  clock: validateFileSizeFx.doneData,
  source: $selectedFile,
  filter: (_, isValid) => isValid,
  fn: (file) => file!,
  target: parseFileFx,
});

// Store parsed contacts and detect accountId conflicts
const $parsedContacts = createStore<ContactImport[] | null>(null).reset(closeModal, resetState);

sample({
  clock: parseFileFx.doneData,
  filter: (result) => result.success && result.data.length > 0,
  fn: (result) => (result.success ? result.data : []),
  target: [$parsedContacts, detectAccountIdConflictsFx],
});

// Set conflicts state with data when conflicts are detected
sample({
  clock: detectAccountIdConflictsFx.doneData,
  source: $parsedContacts,
  filter: (_, conflicts) => conflicts.length > 0,
  fn: (parsed, conflicts): ImportState => ({
    status: 'conflicts',
    conflicts,
    parsed: parsed ?? [],
  }),
  target: $importState,
});

// Import contacts when no conflicts
sample({
  clock: detectAccountIdConflictsFx.doneData,
  source: $parsedContacts,
  filter: (_, conflicts) => conflicts.length === 0,
  fn: (contacts) => contacts ?? [],
  target: replaceContactsFx,
});

// Replace all contacts when user chooses "Replace"
sample({
  clock: replaceConflicts,
  source: $parsedContacts,
  fn: (contacts) => contacts ?? [],
  target: replaceContactsFx,
});

// Import only non-conflicting contacts when user chooses "Keep Current"
sample({
  clock: keepCurrent,
  source: $parsedContacts,
  fn: (contacts) => contacts ?? [],
  target: importNonConflictingFx,
});

export const importContactsModel = {
  $importState,
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
