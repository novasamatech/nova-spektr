import { allSettled, fork } from 'effector';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CryptoType } from '@/shared/core';
import { toAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import {
  CONTACT_MULTISIG_WALLET_ID,
  contactMultisigsModel,
  isContactMultisigAccount,
  toSyntheticMultisigAccount,
} from '../contact-multisigs';
import { multisigOperationService } from '../service';
// `vi.mock` and `vi.hoisted` below are hoisted by the vitest transformer to
// run before any import resolves, so this runtime-import-order comment is for
// readability only: the mock takes effect before `../contact-multisigs`.

const { graphqlRequestMock } = vi.hoisted(() => ({
  graphqlRequestMock: vi.fn(async () => ({ accounts: { nodes: [] as unknown[] } })),
}));
vi.mock('graphql-request', () => {
  class MockGraphQLClient {
    request = graphqlRequestMock;
  }
  return { gql: (s: TemplateStringsArray) => s.join(''), GraphQLClient: MockGraphQLClient };
});

const ALICE = toAccountId('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY');
const BOB = toAccountId('5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty');
const CHARLIE = toAccountId('5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y');

const realMultisigId = (sigs: AccountId[], threshold: number) =>
  multisigOperationService.getMultisigAccountId(sigs, threshold, CryptoType.SR25519);

describe('contactMultisigsModel.discoverFx', () => {
  beforeEach(() => {
    graphqlRequestMock.mockClear();
    graphqlRequestMock.mockResolvedValue({ accounts: { nodes: [] } });
  });

  it('admits a multisig that verifies cryptographically', async () => {
    const sigs = [ALICE, BOB, CHARLIE];
    const multisigId = realMultisigId(sigs, 2);
    graphqlRequestMock.mockResolvedValueOnce({
      accounts: {
        nodes: [
          {
            accountId: multisigId,
            threshold: 2,
            signatories: { nodes: sigs.map(s => ({ signatoryId: s })) },
          },
        ],
      },
    });

    const scope = fork();
    await allSettled(contactMultisigsModel.discoverFx, {
      scope,
      params: {
        accountIds: [multisigId],
        excluded: new Set<AccountId>(),
        nameByAccountId: new Map([[multisigId, { name: 'Treasury', contactIds: ['c1'] }]]),
      },
    });

    const result = scope.getState(contactMultisigsModel.$contactMultisigs);
    expect(result).toHaveLength(1);
    expect(result[0]!.accountId).toBe(multisigId);
    expect(result[0]!.name).toBe('Treasury');
    expect(result[0]!.threshold).toBe(2);
    expect(result[0]!.contactIds).toEqual(['c1']);
  });

  it('rejects rows whose signatories do not cryptographically match', async () => {
    const sigs = [ALICE, BOB, CHARLIE];
    const multisigId = realMultisigId(sigs, 2);
    // Tampered: claim it's a (ALICE, BOB) threshold-1 — wrong.
    graphqlRequestMock.mockResolvedValueOnce({
      accounts: {
        nodes: [
          {
            accountId: multisigId,
            threshold: 1,
            signatories: { nodes: [{ signatoryId: ALICE }, { signatoryId: BOB }] },
          },
        ],
      },
    });

    const scope = fork();
    await allSettled(contactMultisigsModel.discoverFx, {
      scope,
      params: {
        accountIds: [multisigId],
        excluded: new Set<AccountId>(),
        nameByAccountId: new Map(),
      },
    });

    expect(scope.getState(contactMultisigsModel.$contactMultisigs)).toEqual([]);
  });

  it('skips rows with null threshold (account exists but is not a multisig)', async () => {
    graphqlRequestMock.mockResolvedValueOnce({
      accounts: { nodes: [{ accountId: ALICE, threshold: null, signatories: { nodes: [] } }] },
    });

    const scope = fork();
    await allSettled(contactMultisigsModel.discoverFx, {
      scope,
      params: {
        accountIds: [ALICE],
        excluded: new Set<AccountId>(),
        nameByAccountId: new Map(),
      },
    });

    expect(scope.getState(contactMultisigsModel.$contactMultisigs)).toEqual([]);
  });

  it('drops accounts in the exclude set (wallet ownership wins)', async () => {
    const sigs = [ALICE, BOB, CHARLIE];
    const multisigId = realMultisigId(sigs, 2);
    graphqlRequestMock.mockResolvedValueOnce({
      accounts: {
        nodes: [
          {
            accountId: multisigId,
            threshold: 2,
            signatories: { nodes: sigs.map(s => ({ signatoryId: s })) },
          },
        ],
      },
    });

    const scope = fork();
    await allSettled(contactMultisigsModel.discoverFx, {
      scope,
      params: {
        accountIds: [multisigId],
        excluded: new Set<AccountId>([multisigId]),
        nameByAccountId: new Map([[multisigId, { name: 'X', contactIds: ['c1'] }]]),
      },
    });

    expect(scope.getState(contactMultisigsModel.$contactMultisigs)).toEqual([]);
  });

  it('swallows indexer errors and returns the last-known set', async () => {
    graphqlRequestMock.mockRejectedValueOnce(new Error('indexer down'));

    const scope = fork();
    await allSettled(contactMultisigsModel.discoverFx, {
      scope,
      params: {
        accountIds: [ALICE],
        excluded: new Set<AccountId>(),
        nameByAccountId: new Map(),
      },
    });

    expect(scope.getState(contactMultisigsModel.$contactMultisigs)).toEqual([]);
  });

  it('is a no-op when accountIds is empty (no network call)', async () => {
    const scope = fork();
    await allSettled(contactMultisigsModel.discoverFx, {
      scope,
      params: {
        accountIds: [],
        excluded: new Set<AccountId>(),
        nameByAccountId: new Map(),
      },
    });

    expect(graphqlRequestMock).not.toHaveBeenCalled();
  });

  it('skips no-op updates when rediscovery produces a structurally identical set', async () => {
    const sigs = [ALICE, BOB, CHARLIE];
    const multisigId = realMultisigId(sigs, 2);
    graphqlRequestMock.mockResolvedValue({
      accounts: {
        nodes: [
          {
            accountId: multisigId,
            threshold: 2,
            signatories: { nodes: sigs.map(s => ({ signatoryId: s })) },
          },
        ],
      },
    });

    const scope = fork();
    await allSettled(contactMultisigsModel.discoverFx, {
      scope,
      params: {
        accountIds: [multisigId],
        excluded: new Set<AccountId>(),
        nameByAccountId: new Map([[multisigId, { name: 'X', contactIds: ['c1'] }]]),
      },
    });
    const firstRef = scope.getState(contactMultisigsModel.$contactMultisigs);

    await allSettled(contactMultisigsModel.discoverFx, {
      scope,
      params: {
        accountIds: [multisigId],
        excluded: new Set<AccountId>(),
        nameByAccountId: new Map([[multisigId, { name: 'X', contactIds: ['c1'] }]]),
      },
    });

    expect(scope.getState(contactMultisigsModel.$contactMultisigs)).toBe(firstRef);
  });
});

describe('toSyntheticMultisigAccount', () => {
  const sigs = [ALICE, BOB, CHARLIE];
  const multisigId = realMultisigId(sigs, 2);

  it('produces a record conforming to MultisigAccount shape', () => {
    const synthetic = toSyntheticMultisigAccount({
      accountId: multisigId,
      name: 'Treasury',
      signatories: sigs,
      threshold: 2,
      cryptoType: CryptoType.SR25519,
      contactIds: ['c1'],
    });

    expect(synthetic.accountType).toBe('multisig');
    expect(synthetic.accountId).toBe(multisigId);
    expect(synthetic.name).toBe('Treasury');
    expect(synthetic.threshold).toBe(2);
    expect(synthetic.signatories).toHaveLength(3);
    expect(synthetic.walletId).toBe(CONTACT_MULTISIG_WALLET_ID);
    expect(synthetic.id).toBe(`contact-multisig:${multisigId}`);
    expect(isContactMultisigAccount(synthetic)).toBe(true);
  });
});

describe('isContactMultisigAccount', () => {
  it('returns true only for accounts carrying the sentinel walletId', () => {
    expect(isContactMultisigAccount({ walletId: CONTACT_MULTISIG_WALLET_ID })).toBe(true);
    expect(isContactMultisigAccount({ walletId: 1 })).toBe(false);
    expect(isContactMultisigAccount({ walletId: 0 })).toBe(false);
  });
});

describe('verifyMultisig', () => {
  it('returns true for a correctly-derived (sigs, threshold, accountId) triple', () => {
    const sigs = [ALICE, BOB, CHARLIE];
    const multisigId = realMultisigId(sigs, 2);
    expect(contactMultisigsModel.verifyMultisig(multisigId, sigs, 2, CryptoType.SR25519)).toBe(true);
  });

  it('returns false when threshold is invalid', () => {
    const sigs = [ALICE, BOB];
    expect(contactMultisigsModel.verifyMultisig(ALICE, sigs, 0, CryptoType.SR25519)).toBe(false);
    expect(contactMultisigsModel.verifyMultisig(ALICE, sigs, -1, CryptoType.SR25519)).toBe(false);
    expect(contactMultisigsModel.verifyMultisig(ALICE, sigs, 1.5, CryptoType.SR25519)).toBe(false);
  });

  it('returns false when threshold exceeds signatory count', () => {
    expect(contactMultisigsModel.verifyMultisig(ALICE, [ALICE, BOB], 3, CryptoType.SR25519)).toBe(false);
  });

  it('returns false when the claimed accountId does not match the derivation', () => {
    const sigs = [ALICE, BOB, CHARLIE];
    const wrongId = realMultisigId(sigs, 3);
    expect(contactMultisigsModel.verifyMultisig(wrongId, sigs, 2, CryptoType.SR25519)).toBe(false);
  });
});

describe('contactMultisigsModel.resolveMultisigAccountId', () => {
  it('returns accountId for plain multisig accounts', () => {
    const sigs = [ALICE, BOB];
    const synthetic = toSyntheticMultisigAccount({
      accountId: ALICE,
      name: 'X',
      signatories: sigs,
      threshold: 2,
      cryptoType: CryptoType.SR25519,
      contactIds: [],
    });
    expect(contactMultisigsModel.resolveMultisigAccountId(synthetic)).toBe(ALICE);
  });

  it('returns multisigAccountId for flexible multisig accounts (structural)', () => {
    const flex = { multisigAccountId: BOB, accountId: ALICE } as never;
    expect(contactMultisigsModel.resolveMultisigAccountId(flex)).toBe(BOB);
  });
});
