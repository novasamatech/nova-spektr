import { type ContactImport } from './validation';

export type AccountIdConflict = {
  imported: { name: string; address: string; accountId: string };
  existing: { id: string; name: string; address: string; accountId: string };
};

export type ImportState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; reason: 'fileTooLarge' | 'parseError' | 'emptyList' }
  | { status: 'conflicts'; conflicts: AccountIdConflict[]; parsed: ContactImport[] }
  | { status: 'importing' }
  | { status: 'success'; importedCount: number };
