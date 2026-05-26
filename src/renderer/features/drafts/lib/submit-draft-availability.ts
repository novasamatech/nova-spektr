import { type Draft } from '@/domains/backend';

export type DraftSubmitGate = { canSubmit: true; reasonKey: null } | { canSubmit: false; reasonKey: string };

export function getDraftSubmitGate(
  draft: Pick<Draft, 'callData' | 'multisigAccountId'>,
  isAuthenticated: boolean,
  hasMultisigAccount: boolean,
): DraftSubmitGate {
  if (!isAuthenticated) return { canSubmit: false, reasonKey: 'operations.drafts.connectToSubmit' };
  if (!draft.callData) return { canSubmit: false, reasonKey: 'dashboard.operationsQueue.submitNeedsCallData' };
  if (!hasMultisigAccount) return { canSubmit: false, reasonKey: 'dashboard.operationsQueue.submitUnavailable' };

  return { canSubmit: true, reasonKey: null };
}
