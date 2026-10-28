export const enum SubmitStep {
  LOADING,
  SUCCESS,
  WARNING,
  ERROR,
}

export const enum ExtrinsicResult {
  SUCCESS,
  ERROR,
}

export const enum BuildSignedExtrinsicsFailure {
  EMPTY = 'empty',
  COUNT_MISMATCH = 'count-mismatch',
  UNKNOWN_SIGNATORY = 'unknown-signatory',
}

/**
 * Signed payloads could not be turned into extrinsics; `message` holds
 * technical details for logs only.
 */
export class BuildSignedExtrinsicsError extends Error {
  readonly reason: BuildSignedExtrinsicsFailure;

  constructor(reason: BuildSignedExtrinsicsFailure, message: string) {
    super(message);
    this.name = 'BuildSignedExtrinsicsError';
    this.reason = reason;
  }
}
