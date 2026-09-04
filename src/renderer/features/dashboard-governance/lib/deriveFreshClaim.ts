import { type BN } from '@polkadot/util';

import { type ClaimAction } from '@/shared/api/governance';
import { type ID, type Referendum, type TrackId, type TrackInfo, type VotingMap } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount } from '@/domains/network';
import { claimScheduleService } from '@/entities/governance';

import { type GovernanceLockRow } from './buildLockRows';
import { collectClaimable } from './collectClaimable';
import { type UnlockBlockReason, resolveUnlockAccount } from './resolveUnlockAccount';

/**
 * The release re-derived at the moment of the click, or why there is none:
 * `nothing-claimable` when the lock was released (or re-held) since the row was
 * drawn, otherwise the block reason the fresh actions ran into.
 */
export type FreshClaim =
  | { status: 'ready'; actions: ClaimAction[]; amount: BN; initiator: AnyAccount; target: AccountId }
  | { status: 'blocked'; reason: UnlockBlockReason | 'nothing-claimable' };

/**
 * The live slice of one chain's governance data: everything needed to run the
 * claim schedule again against the head, rather than the snapshot the row was
 * drawn from. `null` — as a whole or in `scheduleInputs`/`liveBlock` — means
 * the chain has nothing live to re-run against.
 */
export type LiveClaimInputs = {
  votingMap: VotingMap;
  tracks: Record<string, TrackInfo>;
  liveBlock: number | null;
  scheduleInputs: {
    referendums: Referendum[];
    trackLocks: Record<string, Record<TrackId, BN>>;
    undecidingTimeout: number;
    voteLockingPeriod: number;
  } | null;
} | null;

/**
 * Re-runs one row's claim schedule against the live head and re-resolves who
 * signs the result.
 *
 * The row's figures come from a block snapshot taken every
 * `BLOCK_SNAPSHOT_THROTTLE_MS`; a referendum that ended in between adds a
 * required `remove_vote`, which is origin-bound — so a permissionless payer the
 * snapshot allowed may no longer be allowed to send it, and the initiator has
 * to be resolved again on the fresh actions rather than reused from the row.
 */
export function deriveFreshClaim(
  row: GovernanceLockRow,
  live: LiveClaimInputs,
  allAccounts: AnyAccount[],
  preferredWalletId?: ID | null,
): FreshClaim {
  const votingByTrack = live?.votingMap[row.accountId];

  // Nothing live to re-run against: sign exactly what the row shows.
  if (!live?.scheduleInputs || live.liveBlock === null || !votingByTrack) {
    if (row.claimableActions.length === 0) return { status: 'blocked', reason: 'nothing-claimable' };
    if (!row.initiator) return { status: 'blocked', reason: row.blockReason ?? 'no-signer' };

    return {
      status: 'ready',
      actions: row.claimableActions,
      amount: row.claimable,
      initiator: row.initiator,
      target: row.target,
    };
  }

  const schedule = claimScheduleService.estimateClaimSchedule({
    currentBlockNumber: live.liveBlock,
    referendums: live.scheduleInputs.referendums,
    tracks: live.tracks,
    trackLocks: live.scheduleInputs.trackLocks[row.accountId] ?? {},
    votingByTrack,
    undecidingTimeout: live.scheduleInputs.undecidingTimeout,
    voteLockingPeriod: live.scheduleInputs.voteLockingPeriod,
  });

  const { actions, amount } = collectClaimable(schedule);
  if (actions.length === 0) return { status: 'blocked', reason: 'nothing-claimable' };

  const { initiator, target, reason } = resolveUnlockAccount({
    lockedAccountId: row.accountId,
    candidates: allAccounts.filter((account) => account.accountId === row.accountId),
    chain: row.chain,
    allAccounts,
    actions,
    preferredWalletId,
  });
  if (!initiator) return { status: 'blocked', reason };

  return { status: 'ready', actions, amount, initiator, target };
}
