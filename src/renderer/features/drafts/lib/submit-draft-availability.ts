import { type Draft } from '@/domains/backend';

export type DraftSubmitGate = { canSubmit: true; reasonKey: null } | { canSubmit: false; reasonKey: string };

/**
 * A draft is submittable only along the route it was authored with, so it needs
 * a saved path of at least two nodes (a source and a signer). Legacy drafts
 * predate the field and drafts with a truncated path were never completable —
 * both used to fall back to automatic route discovery, which is exactly the
 * silent re-routing the path is there to prevent.
 */
export function hasSigningPath(draft: Pick<Draft, 'signingPath'>): boolean {
  return Array.isArray(draft.signingPath) && draft.signingPath.length >= 2;
}

export function getDraftSubmitGate(
  draft: Pick<Draft, 'callData' | 'multisigAccountId' | 'signingPath'>,
  isAuthenticated: boolean,
  hasMultisigAccount: boolean,
): DraftSubmitGate {
  if (!isAuthenticated) return { canSubmit: false, reasonKey: 'operations.drafts.connectToSubmit' };
  // Checked before call data: adding call data to a draft that can never be
  // submitted would be busywork.
  if (!hasSigningPath(draft)) return { canSubmit: false, reasonKey: 'operations.drafts.signingPathMissingTooltip' };
  if (!draft.callData) return { canSubmit: false, reasonKey: 'dashboard.operationsQueue.submitNeedsCallData' };
  if (!hasMultisigAccount) return { canSubmit: false, reasonKey: 'dashboard.operationsQueue.submitUnavailable' };

  return { canSubmit: true, reasonKey: null };
}
