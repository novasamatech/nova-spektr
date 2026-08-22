import { describe, expect, it } from 'vitest';

import { type AccountId } from '@/shared/polkadotjs-schemas';

import { resolveSubmitDraftScreen } from './submit-draft-screen';

const MISSING_ID = `1${'0'.repeat(46)}1`.slice(0, 48) as AccountId;

const params = (overrides: Partial<Parameters<typeof resolveSubmitDraftScreen>[0]> = {}) => ({
  hasConfirm: false,
  signatoryCount: 1,
  hasError: false,
  showError: false,
  errorKind: null,
  missingAccountId: null,
  hasChain: true,
  ...overrides,
});

describe('resolveSubmitDraftScreen', () => {
  it('shows the empty-wallet screen when nothing else is wrong', () => {
    expect(resolveSubmitDraftScreen(params({ signatoryCount: 0 }))).toEqual({ kind: 'no-signatories' });
  });

  it('prefers the path error over the empty-wallet screen', () => {
    // An unresolvable path is *why* the signatory list is empty — reporting
    // "no accounts in this wallet" would hide the account the user has to add.
    const screen = resolveSubmitDraftScreen(
      params({
        signatoryCount: 0,
        hasError: true,
        showError: true,
        errorKind: 'signing-path-unresolved',
        missingAccountId: MISSING_ID,
      }),
    );

    expect(screen).toEqual({ kind: 'missing-account', accountId: MISSING_ID });
  });

  it('holds the loader while the error is still debouncing', () => {
    expect(
      resolveSubmitDraftScreen(params({ signatoryCount: 0, hasError: true, errorKind: 'signing-path-unresolved' })),
    ).toEqual({ kind: 'loading' });
  });

  it('shows the missing-path screen for a draft with no usable path', () => {
    expect(
      resolveSubmitDraftScreen(params({ hasError: true, showError: true, errorKind: 'signing-path-missing' })),
    ).toEqual({ kind: 'missing-path' });
  });

  it('falls back to the generic wording when the missing node cannot be named', () => {
    expect(
      resolveSubmitDraftScreen(params({ hasError: true, showError: true, errorKind: 'signing-path-unresolved' })),
    ).toEqual({ kind: 'error', messageKey: 'operations.drafts.signingPathUnresolved' });

    expect(
      resolveSubmitDraftScreen(
        params({
          hasError: true,
          showError: true,
          errorKind: 'signing-path-unresolved',
          missingAccountId: MISSING_ID,
          hasChain: false,
        }),
      ),
    ).toEqual({ kind: 'error', messageKey: 'operations.drafts.signingPathUnresolved' });
  });

  it('reports an extrinsic failure with its own message', () => {
    expect(resolveSubmitDraftScreen(params({ hasError: true, showError: true, errorKind: 'extrinsic' }))).toEqual({
      kind: 'error',
      messageKey: 'operations.drafts.extrinsicError',
    });
  });

  it('renders the confirm step once there is something to confirm', () => {
    expect(resolveSubmitDraftScreen(params({ hasConfirm: true }))).toEqual({ kind: 'confirm' });
  });

  it('keeps the loader while nothing has settled yet', () => {
    expect(resolveSubmitDraftScreen(params())).toEqual({ kind: 'loading' });
  });
});
