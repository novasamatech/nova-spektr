import { describe, expect, it } from 'vitest';

import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type Draft, type PathNode } from '@/domains/backend';

import { preserveSigningPath } from './preserve-signing-path';

const acc = (n: number): AccountId => `1${'0'.repeat(46)}${n}`.slice(0, 48) as AccountId;

const PATH: PathNode[] = [
  { kind: 'multisig', accountId: acc(1) },
  { kind: 'signer', accountId: acc(2) },
];

const makeDraft = (signingPath: PathNode[], callData: string | null = '0x00'): Draft =>
  ({
    id: 'draft-1',
    operation: null,
    multisigAccountId: acc(1),
    chainId: '0x01',
    callData,
    description: 'note',
    createdBy: 'tester',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    signingPath,
    initiatorAccountId: acc(2),
  }) as unknown as Draft;

describe('preserveSigningPath', () => {
  it('keeps the current path when the response comes back without one', () => {
    const updated = preserveSigningPath(makeDraft([], '0x11'), makeDraft(PATH, null));

    expect(updated.signingPath).toEqual(PATH);
    expect(updated.callData).toBe('0x11');
  });

  it('takes the response path when it has one', () => {
    const responsePath: PathNode[] = [
      { kind: 'multisig', accountId: acc(3) },
      { kind: 'signer', accountId: acc(4) },
    ];

    expect(preserveSigningPath(makeDraft(responsePath), makeDraft(PATH)).signingPath).toEqual(responsePath);
  });

  it('does not invent a path when neither side has one', () => {
    expect(preserveSigningPath(makeDraft([]), makeDraft([])).signingPath).toEqual([]);
    expect(preserveSigningPath(makeDraft([]), null).signingPath).toEqual([]);
  });
});
