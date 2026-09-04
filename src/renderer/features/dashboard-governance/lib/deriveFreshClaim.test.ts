import { BN, BN_ZERO } from '@polkadot/util';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type Chunks, type ClaimAction, UnlockChunkType } from '@/shared/api/governance';
import { type WatchOnlyAccount, AccountType, CryptoType, SigningType } from '@/shared/core';
import { createAccountId, polkadotChain, polkadotChainId } from '@/shared/mocks';
import { type AnyAccount, accountService } from '@/domains/network';
import { claimScheduleService } from '@/entities/governance';

import { type GovernanceLockRow } from './buildLockRows';
import { type LiveClaimInputs, deriveFreshClaim } from './deriveFreshClaim';

const lockedId = createAccountId('locked');
const payerId = createAccountId('payer');

const UNLOCK: ClaimAction = { type: 'unlock', trackId: '0' };
const REMOVE_VOTE: ClaimAction = { type: 'remove_vote', trackId: '0', referendumId: '7' };

const signer: AnyAccount = {
  id: 'signer',
  type: 'universal',
  name: '',
  walletId: 1,
  accountId: lockedId,
  cryptoType: CryptoType.SR25519,
  signingType: SigningType.POLKADOT_VAULT,
  createdAt: 0,
};

const payer: AnyAccount = { ...signer, id: 'payer', walletId: 2, accountId: payerId };

const watchOnly: WatchOnlyAccount = {
  id: 'watch-only',
  type: 'universal',
  name: '',
  walletId: 3,
  accountId: lockedId,
  accountType: AccountType.WATCH_ONLY,
  cryptoType: CryptoType.SR25519,
  signingType: SigningType.WATCH_ONLY,
  createdAt: 0,
};

const row = (overrides: Partial<GovernanceLockRow> = {}): GovernanceLockRow => ({
  key: `${polkadotChainId}:${lockedId}`,
  accountId: lockedId,
  chainId: polkadotChainId,
  chain: polkadotChain,
  chainName: 'Polkadot',
  chainIcon: 'dot.svg',
  symbol: 'DOT',
  precision: 10,
  wallet: null,
  locked: new BN(100),
  lockedFiat: null,
  claimable: new BN(100),
  claimableFiat: null,
  claimableActions: [UNLOCK],
  pending: BN_ZERO,
  pendingFiat: null,
  nextUnlockAtMs: null,
  daysUntilNextUnlock: null,
  delegated: BN_ZERO,
  delegatedFiat: null,
  delegations: [],
  undelegateActions: [],
  undelegateInitiator: null,
  undelegateBlockReason: null,
  tracks: ['0'],
  initiator: signer,
  target: lockedId,
  blockReason: null,
  claimableNum: 100,
  lockedNum: 100,
  ...overrides,
});

/** A chain with everything the re-derivation needs; the schedule is stubbed. */
const live = (overrides: Partial<NonNullable<LiveClaimInputs>> = {}): LiveClaimInputs => ({
  votingMap: { [lockedId]: {} },
  tracks: {},
  liveBlock: 1_000,
  scheduleInputs: { referendums: [], trackLocks: {}, undecidingTimeout: 0, voteLockingPeriod: 0 },
  ...overrides,
});

const claimableChunk = (amount: number, actions: ClaimAction[]): Chunks => ({
  type: UnlockChunkType.CLAIMABLE,
  amount: new BN(amount),
  actions,
});

const stubSchedule = (schedule: Chunks[]) =>
  vi.spyOn(claimScheduleService, 'estimateClaimSchedule').mockReturnValue(schedule);

describe('deriveFreshClaim', () => {
  beforeEach(() => {
    // These DI pipelines have no default handler — see resolveUnlockAccount.test.ts.
    accountService.accountAvailabilityOnChainAnyOf.registerHandler({ body: () => true, available: () => true });
    accountService.accountActionPermissionAnyOf.registerHandler({
      body: ({ account }) => account.signingType !== SigningType.WATCH_ONLY,
      available: () => true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    accountService.accountAvailabilityOnChainAnyOf.resetHandlers();
    accountService.accountActionPermissionAnyOf.resetHandlers();
    accountService.accountCanSignMultipleAnyOf.resetHandlers();
    accountService.accountCollectChildrenPipeline.resetHandlers();
  });

  describe('without live inputs', () => {
    it('signs the row exactly as drawn', () => {
      const estimate = stubSchedule([]);

      const result = deriveFreshClaim(row(), null, [signer]);

      expect(result).toEqual({
        status: 'ready',
        actions: [UNLOCK],
        amount: new BN(100),
        initiator: signer,
        target: lockedId,
      });
      expect(estimate).not.toHaveBeenCalled();
    });

    it('falls back to the row when the chain has a head but no schedule inputs', () => {
      const result = deriveFreshClaim(row(), live({ scheduleInputs: null }), [signer]);

      expect(result).toMatchObject({ status: 'ready', initiator: signer });
    });

    it('falls back to the row when the account is not in the live voting map', () => {
      const result = deriveFreshClaim(row(), live({ votingMap: {} }), [signer]);

      expect(result).toMatchObject({ status: 'ready', initiator: signer });
    });

    it('reports a row drawn with nothing to claim', () => {
      const result = deriveFreshClaim(row({ claimableActions: [], claimable: BN_ZERO }), null, [signer]);

      expect(result).toEqual({ status: 'blocked', reason: 'nothing-claimable' });
    });

    it('reports the row block reason when nothing signs for it', () => {
      const result = deriveFreshClaim(row({ initiator: null, blockReason: 'no-local-account' }), null, []);

      expect(result).toEqual({ status: 'blocked', reason: 'no-local-account' });
    });
  });

  it('reports nothing claimable when the live schedule folds to nothing', () => {
    // The lock was released (or re-held) between the snapshot and the click.
    stubSchedule([claimableChunk(0, [UNLOCK])]);

    const result = deriveFreshClaim(row(), live(), [signer]);

    expect(result).toEqual({ status: 'blocked', reason: 'nothing-claimable' });
  });

  it('re-derives the amount and the actions against the live head', () => {
    stubSchedule([claimableChunk(250, [UNLOCK, REMOVE_VOTE])]);

    const result = deriveFreshClaim(row(), live(), [signer]);

    expect(result).toEqual({
      status: 'ready',
      actions: [UNLOCK, REMOVE_VOTE],
      amount: new BN(250),
      initiator: signer,
      target: lockedId,
    });
  });

  it('blocks a watch-only key once a fresh remove_vote appears', () => {
    // The row was drawn on an unlock-only schedule, so a payer could send it.
    // `remove_vote` is origin-bound: the locked key itself must sign, and it
    // never does.
    stubSchedule([claimableChunk(100, [UNLOCK, REMOVE_VOTE])]);

    const result = deriveFreshClaim(row({ initiator: payer, claimableActions: [UNLOCK] }), live(), [watchOnly, payer]);

    expect(result).toEqual({ status: 'blocked', reason: 'watch-only' });
  });

  it('keeps the permissionless payer while the fresh actions stay unlock-only', () => {
    stubSchedule([claimableChunk(100, [UNLOCK])]);

    const result = deriveFreshClaim(row({ initiator: payer, claimableActions: [UNLOCK] }), live(), [watchOnly, payer]);

    expect(result).toMatchObject({ status: 'ready', initiator: payer, target: lockedId });
  });
});
