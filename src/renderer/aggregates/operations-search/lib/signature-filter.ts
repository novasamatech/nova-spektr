/**
 * The Operations view's "Signed" filter, shared with the drafts scope so both
 * lists agree on the same values. `not_signed` — operations a local signatory
 * can still act on; `signed` — operations every local signatory has already
 * approved.
 */
export type SignatureFilterValue = 'signed' | 'not_signed';
