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
 * drawn from. A `null` `liveBlock` or `scheduleInputs` means the chain has
 * nothing live to re-run against — and so does no slice at all.
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
};

type Params = {
  row: GovernanceLockRow;
  /** `null` when the row's chain has no live data at all. */
  live: LiveClaimInputs | null;
  allAccounts: AnyAccount[];
  /** The wallet whose accounts win a tie — see `resolveUnlockAccount`. */
  preferredWalletId?: ID | null;
};

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
export function deriveFreshClaim({ row, live, allAccounts, preferredWalletId }: Params): FreshClaim {
  const votingByTrack = live?.votingMap[row.accountId];

  // Nothing live to re-run against: sign exactly what the row shows.
  if (!live?.scheduleInputs || live.liveBlock === null || !votingByTrack) {
    if (row.claimableActions.length === 0) return { status: 'blocked', reason: 'nothing-claimable' };
    // The fallback is unreachable: the row flattens an `UnlockAccountResolution`,
    // which pairs a null initiator with a reason by construction. It is here
    // because the two fields are separate on the row, not because a row without
    // both has ever been seen — unlike the undelegate reason elsewhere, which is
    // genuinely null when the account delegates nothing.
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
