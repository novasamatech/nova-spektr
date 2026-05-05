import { type Transaction } from 'dexie';

/**
 * Backend contacts are now session-scoped (in-memory only). Drop any rows that
 * the previous persisted implementation left behind. Idempotent: a no-op if the
 * table never had backend rows.
 */
export async function dropPersistedBackendContacts(t: Transaction): Promise<void> {
  const all = await t.table('contacts').toArray();
  const backendIds = all.filter((c) => c.source === 'backend').map((c) => c.id);
  if (backendIds.length === 0) return;

  await t.table('contacts').bulkDelete(backendIds);
}
