import { type DerivationValidationError, type ValidationError } from './types';

export type ErrorDetails = Record<DerivationValidationError, string[]>;

export class DerivationImportError extends Error {
  error: ValidationError;
  errorDetails?: ErrorDetails;
  constructor(error: ValidationError, errorDetails?: ErrorDetails) {
    super();
    this.error = error;
    this.errorDetails = errorDetails;
  }
}
