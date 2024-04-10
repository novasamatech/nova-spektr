import { Transaction } from 'dexie';

export async function resetMetadata(trans: Transaction): Promise<void> {
  await trans.table('metadata').toCollection().delete();
}
