import { allSettled, fork } from 'effector';
import { describe, expect, it } from 'vitest';

import { type BackendContact } from '@/shared/core/types/contact';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type PathNode } from '@/domains/backend';
import { contactModel } from '@/entities/contact';
import { pathModel } from '@/features/signing-path';

import { createDraftModel } from './create-draft-model';

const acc = (n: number): AccountId => `0x${n.toString(16).padStart(64, '0')}` as AccountId;
const signer = (accountId: AccountId): PathNode => ({ kind: 'signer', accountId });
const multisig = (accountId: AccountId): PathNode => ({ kind: 'multisig', accountId });

const multisigContact = (accountId: AccountId, signatories: AccountId[], threshold: number): BackendContact => ({
  id: accountId,
  name: 'Multisig',
  address: accountId as unknown as BackendContact['address'],
  accountId,
  source: 'backend',
  entityNames: [],
  chainId: null,
  chainName: null,
  categoryName: null,
  contactTypeName: null,
  derivationPath: null,
  ownerAccountId: null,
  signatories,
  threshold,
  tags: [],
});

describe('createDraftModel · final signer', () => {
  it('$canHaveFinalSigner is false without a multisig in the path', () => {
    const scope = fork({ values: [[pathModel.$path, []]] });

    expect(scope.getState(createDraftModel.$canHaveFinalSigner)).toBe(false);
  });

  it('$canHaveFinalSigner is true when the path contains a multisig', () => {
    const scope = fork({ values: [[pathModel.$path, [multisig(acc(1)), signer(acc(2))]]] });

    expect(scope.getState(createDraftModel.$canHaveFinalSigner)).toBe(true);
  });

  it('$finalSignerCandidates lists the multisig signatories minus the initiator', () => {
    const m = acc(1);
    const initiator = acc(2);
    const bob = acc(3);
    const scope = fork({
      values: [
        [pathModel.$path, [multisig(m), signer(initiator)]],
        [contactModel.$backendContacts, [multisigContact(m, [initiator, bob], 2)]],
      ],
    });

    expect(scope.getState(createDraftModel.$finalSignerCandidates)).toEqual([bob]);
  });

  it('toggling off clears any selected final signer', async () => {
    const scope = fork();

    await allSettled(createDraftModel.finalSignerToggled, { scope, params: true });
    await allSettled(createDraftModel.finalSignerSelected, { scope, params: acc(3) });
    expect(scope.getState(createDraftModel.$finalSignerAccountId)).toBe(acc(3));

    await allSettled(createDraftModel.finalSignerToggled, { scope, params: false });

    expect(scope.getState(createDraftModel.$isFinalSignerEnabled)).toBe(false);
    expect(scope.getState(createDraftModel.$finalSignerAccountId)).toBeNull();
  });

  it('modalClosed resets the toggle and selection', async () => {
    const scope = fork();

    await allSettled(createDraftModel.finalSignerToggled, { scope, params: true });
    await allSettled(createDraftModel.finalSignerSelected, { scope, params: acc(3) });

    await allSettled(createDraftModel.modalClosed, { scope });

    expect(scope.getState(createDraftModel.$isFinalSignerEnabled)).toBe(false);
    expect(scope.getState(createDraftModel.$finalSignerAccountId)).toBeNull();
  });

  it('drops a stale selection once it leaves the candidate set', async () => {
    const m = acc(1);
    const initiator = acc(2);
    const bob = acc(3);
    const scope = fork({
      values: [
        [pathModel.$path, [multisig(m), signer(initiator)]],
        [contactModel.$backendContacts, [multisigContact(m, [initiator, bob], 2)]],
      ],
    });

    await allSettled(createDraftModel.finalSignerSelected, { scope, params: bob });
    expect(scope.getState(createDraftModel.$finalSignerAccountId)).toBe(bob);

    // Re-point the path's signer leaf at bob — now bob is the initiator and no
    // longer a candidate, so the stale selection must clear.
    await allSettled(pathModel.pathSeeded, { scope, params: [multisig(m), signer(bob)] });

    expect(scope.getState(createDraftModel.$finalSignerCandidates)).toEqual([initiator]);
    expect(scope.getState(createDraftModel.$finalSignerAccountId)).toBeNull();
  });

  it('auto-disables when the path loses its multisig', async () => {
    const scope = fork({ values: [[pathModel.$path, [multisig(acc(1)), signer(acc(2))]]] });

    await allSettled(createDraftModel.finalSignerToggled, { scope, params: true });
    expect(scope.getState(createDraftModel.$isFinalSignerEnabled)).toBe(true);

    await allSettled(pathModel.pathReset, { scope });

    expect(scope.getState(createDraftModel.$isFinalSignerEnabled)).toBe(false);
    expect(scope.getState(createDraftModel.$finalSignerAccountId)).toBeNull();
  });
});
