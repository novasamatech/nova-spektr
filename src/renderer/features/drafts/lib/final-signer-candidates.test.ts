import { describe, expect, it } from 'vitest';

import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type PathNode } from '@/domains/backend';

import { deriveFinalSignerCandidates } from './final-signer-candidates';

const acc = (n: number): AccountId => `0x${n.toString(16).padStart(64, '0')}` as AccountId;
const signer = (accountId: AccountId): PathNode => ({ kind: 'signer', accountId });
const multisig = (accountId: AccountId): PathNode => ({ kind: 'multisig', accountId });

const lookup = (entries: [AccountId, AccountId[]][]) =>
  new Map(entries.map(([id, signatories]) => [id, { signatories }]));

describe('deriveFinalSignerCandidates', () => {
  it('returns [] for an empty path (no multisig)', () => {
    expect(deriveFinalSignerCandidates([], lookup([]))).toEqual([]);
  });

  it('excludes the initiating signer for a single multisig', () => {
    const m = acc(1);
    const initiator = acc(2);
    const bob = acc(3);
    const carol = acc(4);
    const path = [multisig(m), signer(initiator)];

    expect(deriveFinalSignerCandidates(path, lookup([[m, [initiator, bob, carol]]]))).toEqual([bob, carol]);
  });

  it('uses the deepest multisig signatories for a nested path, excluding the leaf signer', () => {
    const top = acc(1);
    const mid = acc(2);
    const initiator = acc(3);
    const bob = acc(4);
    // top-multisig -> mid-multisig -> signer(initiator); candidates are mid's other signatories.
    const path = [multisig(top), multisig(mid), signer(initiator)];
    const map = lookup([
      [top, [mid, acc(9)]],
      [mid, [initiator, bob]],
    ]);

    expect(deriveFinalSignerCandidates(path, map)).toEqual([bob]);
  });

  it('returns [] when the only signatory is the initiator', () => {
    const m = acc(1);
    const initiator = acc(2);
    const path = [multisig(m), signer(initiator)];

    expect(deriveFinalSignerCandidates(path, lookup([[m, [initiator]]]))).toEqual([]);
  });

  it('returns [] when the deepest multisig is missing from the lookup', () => {
    const m = acc(1);
    const initiator = acc(2);
    const path = [multisig(m), signer(initiator)];

    expect(deriveFinalSignerCandidates(path, lookup([]))).toEqual([]);
  });
});
