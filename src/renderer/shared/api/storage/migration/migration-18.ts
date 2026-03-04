import { type Transaction } from 'dexie';

/**
 * Step 1 of contacts primary key migration (++id → id). Copies old contacts
 * into _contactsBackup before the old table is dropped.
 */
export async function backupContactsBeforePKChange(t: Transaction): Promise<void> {
  const old = await t.table('contacts').toArray();
  if (old.length === 0) return;

  await t.table('_contactsBackup').bulkPut(old);
}

/**
 * Step 2 of contacts primary key migration. Restores contacts from
 * _contactsBackup into the new contacts table (id: string, source).
 */
export async function restoreContactsAfterPKChange(t: Transaction): Promise<void> {
  const backup = await t.table('_contactsBackup').toArray();
  if (backup.length === 0) return;

  const migrated = backup.map((c) => ({
    ...c,
    id: crypto.randomUUID(),
    source: 'local' as const,
  }));

  await t.table('contacts').bulkPut(migrated);
}

/**
 * Used by importDb to migrate old-format contacts in an already-open database.
 */
export async function migrateContactsToStringIds(t: Transaction): Promise<void> {
  const oldContacts = await t.table('contacts').toArray();
  if (oldContacts.length === 0) return;

  const needsMigration = oldContacts.some((c) => typeof c.id === 'number' || c.source === undefined);
  if (!needsMigration) return;

  await t.table('contacts').clear();

  const migrated = oldContacts.map((c) => ({
    ...c,
    id: typeof c.id === 'string' ? c.id : crypto.randomUUID(),
    source: c.source ?? 'local',
  }));

  await t.table('contacts').bulkPut(migrated);
}
