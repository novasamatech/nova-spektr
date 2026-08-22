import { describe, expect, it } from 'vitest';

import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type Draft } from '@/domains/backend';

import { getDraftSubmitGate, hasSigningPath } from './submit-draft-availability';

const acc = (n: number): AccountId => `1${'0'.repeat(46)}${n}`.slice(0, 48) as AccountId;

const draft = (overrides: Partial<Draft> = {}): Pick<Draft, 'callData' | 'multisigAccountId' | 'signingPath'> => ({
  callData: '0x0000',
  multisigAccountId: acc(1),
  signingPath: [
    { kind: 'multisig', accountId: acc(1) },
    { kind: 'signer', accountId: acc(2) },
  ],
  ...overrides,
});

describe('hasSigningPath', () => {
  it('accepts a source + signer path', () => {
    expect(hasSigningPath(draft())).toBe(true);
  });

  it('rejects a legacy draft with no path', () => {
    expect(hasSigningPath(draft({ signingPath: [] }))).toBe(false);
  });

  it('rejects a truncated path that never reaches a signer', () => {
    expect(hasSigningPath(draft({ signingPath: [{ kind: 'multisig', accountId: acc(1) }] }))).toBe(false);
  });
});

describe('getDraftSubmitGate', () => {
  it('allows a signed-in user with call data, a path and a local account', () => {
    expect(getDraftSubmitGate(draft(), true, true)).toEqual({ canSubmit: true, reasonKey: null });
  });

  it('blocks a draft without a signing path, ahead of the call-data check', () => {
    expect(getDraftSubmitGate(draft({ signingPath: [], callData: null }), true, true)).toEqual({
      canSubmit: false,
      reasonKey: 'operations.drafts.signingPathMissingTooltip',
    });
  });

  it('keeps the sign-in check first', () => {
    expect(getDraftSubmitGate(draft({ signingPath: [] }), false, true)).toEqual({
      canSubmit: false,
      reasonKey: 'operations.drafts.connectToSubmit',
    });
  });

  it('still blocks on missing call data and missing local account', () => {
    expect(getDraftSubmitGate(draft({ callData: null }), true, true)).toEqual({
      canSubmit: false,
      reasonKey: 'dashboard.operationsQueue.submitNeedsCallData',
    });
    expect(getDraftSubmitGate(draft(), true, false)).toEqual({
      canSubmit: false,
      reasonKey: 'dashboard.operationsQueue.submitUnavailable',
    });
  });
});
