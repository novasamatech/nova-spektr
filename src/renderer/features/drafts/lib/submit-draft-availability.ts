import { type Draft } from '@/domains/backend';
import { isUsablePath } from '@/features/signing-path';

export type DraftSubmitGate = { canSubmit: true; reasonKey: null } | { canSubmit: false; reasonKey: string };

/**
 * A draft is submittable only along the route it was authored with, so it needs
 * a path that can be followed. Legacy drafts predate the field and drafts with
 * a truncated path were never completable — both used to fall back to automatic
 * route discovery, which is exactly the silent re-routing the path is there to
 * prevent. What counts as followable is `signing-path`'s rule, not ours.
 */
export function hasSigningPath(draft: Pick<Draft, 'signingPath'>): boolean {
  return isUsablePath(draft.signingPath);
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
