import { type ContactImport } from './validation';

export type AccountIdConflict = {
  imported: { name: string; address: string; accountId: string };
  existing: { id: string; name: string; address: string; accountId: string };
};

export type DuplicateGroup = {
  accountId: string;
  address: string;
  names: string[];
};

export type DuplicateResolutions = Record<string, string | null>;

export type ImportState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; reason: 'fileTooLarge' | 'parseError' | 'emptyList' }
  | { status: 'duplicates'; duplicates: DuplicateGroup[] }
  | { status: 'conflicts'; conflicts: AccountIdConflict[]; parsed: ContactImport[] }
  | { status: 'importing' }
  | { status: 'success'; importedCount: number };
