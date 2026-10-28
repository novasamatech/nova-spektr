/**
 * Thrown by `transactionService.splitExtrinsic` when an extrinsic does not fit
 * into a single extrinsic's weight budget and cannot be split either (a
 * multisig call must be signed exactly as co-signers agreed on). Signing it
 * would only end in a chain-side `ExhaustsResources` rejection.
 */
export class ExtrinsicTooHeavyError extends Error {
  readonly section: string;
  readonly method: string;

  constructor(section: string, method: string) {
    super(`Extrinsic ${section}.${method} exceeds the single extrinsic weight limit and cannot be split`);
    this.name = 'ExtrinsicTooHeavyError';
    this.section = section;
    this.method = method;
  }
}
