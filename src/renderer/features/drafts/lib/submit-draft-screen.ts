import { type AccountId } from '@/shared/polkadotjs-schemas';

export type SubmitDraftErrorKind = 'extrinsic' | 'signing-path-unresolved' | 'signing-path-missing';

export type SubmitDraftScreen =
  /** The wallet holds no account that could sign this operation. */
  | { kind: 'no-signatories' }
  /** The draft was saved without a followable path — recreate it. */
  | { kind: 'missing-path' }
  /** One account on the path isn't local; name it so the user can add it. */
  | { kind: 'missing-account'; accountId: AccountId }
  /** Anything else that stops the transaction being built. */
  | { kind: 'error'; messageKey: string }
  | { kind: 'loading' }
  | { kind: 'confirm' };

type Params = {
  hasConfirm: boolean;
  signatoryCount: number;
  /** Live error flag — true the moment resolution fails. */
  hasError: boolean;
  /** Debounced error flag; keeps a transient init flip off the screen. */
  showError: boolean;
  errorKind: SubmitDraftErrorKind | null;
  missingAccountId: AccountId | null;
  hasChain: boolean;
};

/**
 * Picks which screen the submit dialog shows. Extracted from the component
 * because the _order_ is the load-bearing part and it is easy to get wrong: an
 * unresolvable path usually also empties the signatory list (the wallet holds
 * no account for the path's leaf), so a plain "no signatories first" check
 * hides the specific, actionable message behind a generic one.
 */
export function resolveSubmitDraftScreen({
  hasConfirm,
  signatoryCount,
  hasError,
  showError,
  errorKind,
  missingAccountId,
  hasChain,
}: Params): SubmitDraftScreen {
  // Only claim "this wallet has no accounts" when nothing more specific is wrong.
  if (signatoryCount === 0 && !hasError) return { kind: 'no-signatories' };
  if (hasConfirm) return { kind: 'confirm' };
  if (!showError) return { kind: 'loading' };

  if (errorKind === 'signing-path-missing') return { kind: 'missing-path' };

  if (errorKind === 'signing-path-unresolved') {
    // Naming the account needs a chain to render it against; without one, fall
    // back to the generic wording rather than showing a bare hex accountId.
    if (missingAccountId && hasChain) return { kind: 'missing-account', accountId: missingAccountId };

    return { kind: 'error', messageKey: 'operations.drafts.signingPathUnresolved' };
  }

  return { kind: 'error', messageKey: 'operations.drafts.extrinsicError' };
}
