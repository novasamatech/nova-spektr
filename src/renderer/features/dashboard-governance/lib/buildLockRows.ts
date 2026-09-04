import { type BN } from '@polkadot/util';

import { type ClaimAction } from '@/shared/api/governance';
import { type Chain, type ChainId, type ID, type Wallet } from '@/shared/core';
import { toAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount } from '@/domains/network';

import { type UnlockBlockReason, resolveUnlockAccount } from './resolveUnlockAccount';
import { type AccountLockSummary, type Delegation } from './summarizeAccountLocks';
import { buildUndelegateActions } from './undelegateActions';

const DAY_MS = 86_400_000;

export type GovernanceLockRow = {
  key: string;
  accountId: AccountId;
  chainId: ChainId;
  chain: Chain;
  chainName: string;
  chainIcon: string;
  symbol: string;
  precision: number;
  /**
   * The wallet that signs — the initiator's wallet; `null` when nothing local
   * signs.
   */
  wallet: Wallet | null;
  locked: BN;
  lockedFiat: string | null;
  claimable: BN;
  claimableFiat: string | null;
  claimableActions: ClaimAction[];
  pending: BN;
  pendingFiat: string | null;
  /** Estimated ms timestamp of the next pending release; `null` when unknown. */
  nextUnlockAtMs: number | null;
  /** Days until `nextUnlockAtMs`, rounded and floored at 0; `null` when unknown. */
  daysUntilNextUnlock: number | null;
  delegated: BN;
  delegatedFiat: string | null;
  /** The delegations behind `delegated`, in track order. */
  delegations: Delegation[];
  /**
   * `undelegate` per delegated track, then `unlock` for the tracks without
   * conviction; empty when nothing is delegated.
   */
  undelegateActions: ClaimAction[];
  /** Who signs the undelegate — origin-bound, so never a permissionless payer. */
  undelegateInitiator: AnyAccount | null;
  undelegateBlockReason: UnlockBlockReason | null;
  tracks: string[];
  initiator: AnyAccount | null;
  target: AccountId;
  blockReason: UnlockBlockReason | null;
  /**
   * Sorting helpers for the table, which compares plain values. `Number` of a
   * planck string is exact below 2^53 (~900k DOT); above it only ties blur.
   */
  claimableNum: number;
  lockedNum: number;
};

export type ToFiat = (amount: string, precision: number, priceId: string) => string | null;

/** The per-chain slice of `ChainGovernanceData` the rows are built from. */
export type LockRowsSource = {
  chainId: ChainId;
  chainName: string;
  symbol: string;
  precision: number;
  icon: { colored: string };
  priceId: string;
  blockTimeMs: number | null;
  currentBlock: number | null;
  locksByAccount: Record<string, AccountLockSummary>;
};

type Params = {
  data: LockRowsSource | null;
  chain: Chain | undefined;
  allAccounts: AnyAccount[];
  wallets: Wallet[];
  /** `null` when fiat is off or prices are not in yet. */
  toFiat: ToFiat | null;
  /** The instant unlock estimates are measured from. */
  now: number;
  preferredWalletId?: ID | null;
};

/**
 * One row per account with a lock on the chain. Accounts whose claim schedule
 * folded to nothing are left out — a chain drops out of the table when none of
 * the selected accounts holds anything on it.
 */
export function buildLockRows({
  data,
  chain,
  allAccounts,
  wallets,
  toFiat,
  now,
  preferredWalletId,
}: Params): GovernanceLockRow[] {
  if (!data || !chain) return [];

  const rows: GovernanceLockRow[] = [];

  for (const [rawId, summary] of Object.entries(data.locksByAccount)) {
    if (summary.maxLock.isZero()) continue;

    const accountId = toAccountId(rawId);
    const candidates = allAccounts.filter((account) => account.accountId === accountId);
    const { initiator, target, reason } = resolveUnlockAccount({
      lockedAccountId: accountId,
      candidates,
      chain,
      allAccounts,
      actions: summary.claimableActions,
      preferredWalletId,
    });
    const undelegateActions = buildUndelegateActions(summary.delegations);
    const undelegate =
      undelegateActions.length > 0
        ? resolveUnlockAccount({
            lockedAccountId: accountId,
            candidates,
            chain,
            allAccounts,
            actions: undelegateActions,
            preferredWalletId,
          })
        : null;
    const wallet = initiator ? (wallets.find((w) => w.id === initiator.walletId) ?? null) : null;

    const fiat = (value: BN) => (toFiat ? toFiat(value.toString(), data.precision, data.priceId) : null);
    const nextUnlockAtMs =
      summary.nextUnlockBlock !== null && data.blockTimeMs !== null && data.currentBlock !== null
        ? now + (summary.nextUnlockBlock - data.currentBlock) * data.blockTimeMs
        : null;
    const daysUntilNextUnlock =
      nextUnlockAtMs !== null ? Math.max(0, Math.round((nextUnlockAtMs - now) / DAY_MS)) : null;

    rows.push({
      key: `${data.chainId}:${accountId}`,
      accountId,
      chainId: data.chainId,
      chain,
      chainName: data.chainName,
      chainIcon: data.icon.colored,
      symbol: data.symbol,
      precision: data.precision,
      wallet,
      locked: summary.maxLock,
      lockedFiat: fiat(summary.maxLock),
      claimable: summary.claimable,
      claimableFiat: summary.claimable.isZero() ? null : fiat(summary.claimable),
      claimableActions: summary.claimableActions,
      pending: summary.pending,
      pendingFiat: summary.pending.isZero() ? null : fiat(summary.pending),
      nextUnlockAtMs,
      daysUntilNextUnlock,
      delegated: summary.delegated,
      delegatedFiat: summary.delegated.isZero() ? null : fiat(summary.delegated),
      delegations: summary.delegations,
      undelegateActions,
      undelegateInitiator: undelegate?.initiator ?? null,
      undelegateBlockReason: undelegate?.reason ?? null,
      tracks: summary.tracks,
      initiator,
      target,
      blockReason: reason,
      claimableNum: Number(summary.claimable.toString()),
      lockedNum: Number(summary.maxLock.toString()),
    });
  }

  return rows;
}

/**
 * Claimable first, then the size of the lock — the money the user can take home
 * on top.
 */
export const compareLockRows = (a: GovernanceLockRow, b: GovernanceLockRow) =>
  b.claimable.cmp(a.claimable) || b.locked.cmp(a.locked);
