import { beforeAll, describe, expect, it } from 'vitest';

import { type Chain, type ChainId, type MultisigAccount, AccountType, CryptoType, SigningType } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import {
  type AnyAccount,
  type MultisigOperation,
  MultisigEventStatus,
  MultisigOperationStatus,
  accountService,
} from '@/domains/network';
import { filterAwaitingSignature, filterScopedDrafts } from '../queue-model';

const TEST_CHAIN_ID = '0xchain' as ChainId;
const testChain = { chainId: TEST_CHAIN_ID, options: [], assets: [] } as unknown as Chain;
const chains: Record<ChainId, Chain> = { [TEST_CHAIN_ID]: testChain };

beforeAll(() => {
  accountService.accountAvailabilityOnChainAnyOf.registerHandler({ body: () => true, available: () => true });
});

const aId = (i: number): AccountId => `0x${String(i).padStart(64, '0')}` as AccountId;

const userAccount = (id: AccountId): AnyAccount =>
  ({
    id: id as unknown as number,
    walletId: 1,
    accountId: id,
    cryptoType: CryptoType.SR25519,
    accountType: AccountType.BASE,
    name: 'user',
    type: 'universal',
  }) as unknown as AnyAccount;

const watchOnlyAccount = (id: AccountId): AnyAccount =>
  ({
    ...userAccount(id),
    accountType: AccountType.WATCH_ONLY,
    signingType: SigningType.WATCH_ONLY,
  }) as unknown as AnyAccount;

const multisigAccount = (multisigId: AccountId, signatories: AccountId[]): MultisigAccount =>
  ({
    id: 99,
    walletId: 99,
    accountId: multisigId,
    cryptoType: CryptoType.SR25519,
    accountType: AccountType.MULTISIG,
    name: 'ms',
    type: 'universal',
    signatories: signatories.map((s) => ({ accountId: s })),
    threshold: 2,
  }) as unknown as MultisigAccount;

const op = (
  overrides: Partial<MultisigOperation> & { multisigAccountId: AccountId; approvers?: AccountId[] },
): MultisigOperation => {
  const { approvers = [], ...rest } = overrides;
  return {
    id: 'op-1',
    status: MultisigOperationStatus.Pending,
    transaction: null,
    method: null,
    section: null,
    callHash: '0xhash',
    callData: null,
    chainId: '0xchain',
    depositor: approvers[0] ?? overrides.multisigAccountId,
    blockCreated: 0,
    indexCreated: 0,
    events: approvers.map((accountId, i) => ({
      id: `e${i}`,
      accountId,
      status: MultisigEventStatus.Approve,
      blockCreated: 0,
      indexCreated: 0,
      timestamp: 0,
    })),
    timestamp: 0,
    ...rest,
  } as unknown as MultisigOperation;
};

describe('filterScopedDrafts', () => {
  it('returns nothing when selection is empty', () => {
    const result = filterScopedDrafts([{ multisigAccountId: aId(1) } as never], new Set());
    expect(result).toEqual([]);
  });

  it('matches when multisigAccountId is selected', () => {
    const draft = { id: 'd', multisigAccountId: aId(1) } as never;
    expect(filterScopedDrafts([draft], new Set([aId(1) as string]))).toEqual([draft]);
  });

  it('matches when proxy or initiator is selected', () => {
    const a = { id: 'a', multisigAccountId: null, proxyAccountId: aId(2), initiatorAccountId: null } as never;
    const b = { id: 'b', multisigAccountId: null, proxyAccountId: null, initiatorAccountId: aId(3) } as never;
    expect(filterScopedDrafts([a, b], new Set([aId(2) as string]))).toEqual([a]);
    expect(filterScopedDrafts([a, b], new Set([aId(3) as string]))).toEqual([b]);
  });
});

describe('filterAwaitingSignature', () => {
  const userId = aId(10);
  const otherSigner = aId(11);
  const multisigId = aId(99);

  it('includes pending op where user is a signatory and has not approved', () => {
    const result = filterAwaitingSignature(
      [op({ multisigAccountId: multisigId })],
      [userAccount(userId), multisigAccount(multisigId, [userId, otherSigner])],
      new Set([multisigId as string]),
      chains,
    );
    expect(result).toHaveLength(1);
  });

  it('excludes op when user has already approved', () => {
    const result = filterAwaitingSignature(
      [op({ multisigAccountId: multisigId, approvers: [userId] })],
      [userAccount(userId), multisigAccount(multisigId, [userId, otherSigner])],
      new Set([multisigId as string]),
      chains,
    );
    expect(result).toEqual([]);
  });

  it('excludes non-pending ops', () => {
    const result = filterAwaitingSignature(
      [op({ multisigAccountId: multisigId, status: MultisigOperationStatus.Executed })],
      [userAccount(userId), multisigAccount(multisigId, [userId, otherSigner])],
      new Set([multisigId as string]),
      chains,
    );
    expect(result).toEqual([]);
  });

  it('excludes ops whose multisig is not in selection', () => {
    const result = filterAwaitingSignature(
      [op({ multisigAccountId: multisigId })],
      [userAccount(userId), multisigAccount(multisigId, [userId, otherSigner])],
      new Set([aId(999) as string]),
      chains,
    );
    expect(result).toEqual([]);
  });

  it('excludes ops whose chain is not available to the signer', () => {
    const result = filterAwaitingSignature(
      [op({ multisigAccountId: multisigId })],
      [userAccount(userId), multisigAccount(multisigId, [userId, otherSigner])],
      new Set([multisigId as string]),
      {} as Record<ChainId, Chain>,
    );
    expect(result).toEqual([]);
  });

  it('excludes ops where the user controls no signatory', () => {
    const result = filterAwaitingSignature(
      [op({ multisigAccountId: multisigId })],
      [userAccount(aId(20)), multisigAccount(multisigId, [userId, otherSigner])],
      new Set([multisigId as string]),
      chains,
    );
    expect(result).toEqual([]);
  });

  it('skips watch-only signatories — they cannot sign', () => {
    const result = filterAwaitingSignature(
      [op({ multisigAccountId: multisigId })],
      [watchOnlyAccount(userId), multisigAccount(multisigId, [userId, otherSigner])],
      new Set([multisigId as string]),
      chains,
    );
    expect(result).toEqual([]);
  });
});
