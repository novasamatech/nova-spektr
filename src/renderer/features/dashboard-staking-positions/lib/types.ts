import { type Asset, type Chain, type Wallet } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount } from '@/domains/network';
import { type NominationStatus, type PositionStatus, type StakingPosition } from '@/domains/staking';

/**
 * Why a position offers no actions. Each maps to its own tooltip, because the
 * four are not equally final and the user's next move differs: two are facts
 * about the address, one asks them to connect something, one to ask an admin.
 *
 * - `watchOnly` — a local account this installation holds no key for;
 * - `noDraftRoute` — not ours, and no multisig or proxy could sign for it, so
 *   there is no draft to author either;
 * - `draftsNotConnected` — it could be a draft source, but no external address
 *   book was ever connected, and drafts live in one;
 * - `draftsNoPermission` — it could be a draft source, but this account is not
 *   allowed to create drafts.
 */
export type PositionBlockedReason = 'watchOnly' | 'noDraftRoute' | 'draftsNotConnected' | 'draftsNoPermission';

/**
 * The verdict for one position: what may be done, and why not when nothing may.
 *
 * A union rather than a `{ mode, reason }` pair so that "is this blocked" and
 * "why" are one question with one answer. Spelled as two independent fields,
 * the invariant "`reason` is set exactly when blocked" lived in a comment, and
 * callers picked whichever field they happened to reach for — the table asked
 * `mode`, the drawer asked `reason`, and nothing stopped the two from being
 * constructed out of step.
 *
 * - `direct` — a local, signable account; the flow goes straight to sign;
 * - `multisig` — a multisig whose signatory set contains a key of this
 *   installation, so the operation can be started here and co-signed later;
 * - `draft` — no local signer reaches the account, but a draft can be authored
 *   for it and handed to whoever can;
 * - `blocked` — none of the above; the row is data only.
 */
export type PositionAccess =
  | { mode: 'direct' | 'multisig' | 'draft' }
  | { mode: 'blocked'; reason: PositionBlockedReason };

/** `2 of 3` chip data of a multisig account. */
export type MultisigThreshold = {
  threshold: number;
  signatories: number;
};

/** How close an unclaimed payout is to falling out of the runtime history. */
export type ExpiryUrgency = 'critical' | 'warning' | 'safe';

/** One row of the positions table — everything it renders without a hook. */
export type PositionRow = {
  /** `${chainId}-${accountId}` — stable across sorting and re-fetches. */
  id: string;
  position: StakingPosition;
  accountId: AccountId;
  chain: Chain;
  asset: Asset;
  /** The local account behind the position, `null` when none is known. */
  account: AnyAccount | null;
  /** Wallet the account belongs to, `null` for a foreign / contact account. */
  wallet: Wallet | null;
  access: PositionAccess;
  multisig: MultisigThreshold | null;
  /** Mirrors `position.status` — the table needs it as a sortable column key. */
  status: PositionStatus;
  /** Ledger total — bonded plus everything still unbonding, in planck. */
  staked: string;
  /** Share of the chain's visible total, in percent. */
  sharePercent: number;
  /**
   * Mean APY of the validators that matter for this position, `null` when
   * unknown.
   */
  apy: number | null;
  activeValidatorCount: number;
  nominationCount: number;
  /** Pending drafts initiated by this account on this chain. */
  draftCount: number;
};

/** One row of the drawer's nominations table. */
export type NominationRow = {
  accountId: AccountId;
  status: NominationStatus;
  /**
   * Our stake backing this validator in the active era, planck. `null` when not
   * exposed.
   */
  ourStake: string | null;
  /** Commission in percent, `null` when the validator is not in the era set. */
  commission: number | null;
  apy: number | null;
  eraPoints: number | null;
};

/**
 * The same three-way answer the KPI row's nomination spread shows, so the two
 * surfaces can never disagree about what "dropped out" means.
 */
export type { NominationStatus };

export type NominationCounts = {
  total: number;
  active: number;
  waiting: number;
  droppedOut: number;
};
