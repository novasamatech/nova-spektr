import { ImportErrorsLabel } from '../lib/types';

export class DerivationImportError extends Error {
  paths?: string[];
  message: ImportErrorsLabel;
  constructor(message: ImportErrorsLabel, invalidPaths?: string[]) {
    super(message);
    this.message = message;
    this.paths = invalidPaths;
  }
}
