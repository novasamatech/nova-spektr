import { ValidationErrorsLabel } from '../lib/types';

export class DerivationImportError extends Error {
  paths?: string[];
  message: ValidationErrorsLabel;
  constructor(message: ValidationErrorsLabel, invalidPaths?: string[]) {
    super(message);
    this.message = message;
    this.paths = invalidPaths;
  }
}
