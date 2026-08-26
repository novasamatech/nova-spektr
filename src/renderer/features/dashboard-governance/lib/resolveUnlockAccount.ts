import { type ClaimAction } from '@/shared/api/governance';
import { type Chain } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount, accountService } from '@/domains/network';
import { accountUtils } from '@/entities/wallet';

/**
 * Why a locked account cannot be released from here.
 *
 * - `no-local-account` — a contact, or a key held only by a hidden wallet.
 * - `chain-unsupported` — the wallet holds the key but cannot act on this chain.
 * - `watch-only` — the key never signs and a `remove_vote` (origin-bound) is
 *   required.
 * - `no-signer` — nothing local signs for it, and no local payer can release it
 *   permissionlessly.
 */
export type UnlockBlockReason = 'no-local-account' | 'chain-unsupported' | 'watch-only' | 'no-signer';

export type UnlockAccountResolution = {
  /**
   * The account that originates the transaction; `null` when `reason` says why
   * not.
   */
  initiator: AnyAccount | null;
  /** The account whose lock is released — the locked account itself, always. */
  target: AccountId;
  reason: UnlockBlockReason | null;
};

type Params = {
  /** The key whose lock is released. */
  lockedAccountId: AccountId;
  /** Local accounts behind that key (empty for a contact). */
  candidates: AnyAccount[];
  chain: Chain;
  allAccounts: AnyAccount[];
  actions: ClaimAction[];
};

const isPermissionlessRelease = (actions: ClaimAction[]) =>
  actions.length > 0 && actions.every((action) => action.type === 'unlock');

/**
 * `convictionVoting.unlock(class, target)` is permissionless; `removeVote` must
 * be signed by the voter. So the locked account signs for itself whenever it
 * can, and a local payer may step in only for an unlock-only release.
 */
export const resolveUnlockAccount = ({
  lockedAccountId,
  candidates,
  chain,
  allAccounts,
  actions,
}: Params): UnlockAccountResolution => {
  const target = lockedAccountId;

  const onChain = candidates.filter((account) => accountService.isAccountAvailableOnChain(account, chain));
  const own =
    onChain.find((candidate) => accountService.hasPermissionToMakeActions(candidate)) ??
    onChain.find((candidate) => accountService.findSignatories(candidate, allAccounts, chain).length > 0) ??
    null;

  if (own) return { initiator: own, target, reason: null };

  if (isPermissionlessRelease(actions)) {
    const payer =
      allAccounts.find(
        (account) =>
          account.accountId !== lockedAccountId &&
          accountService.isAccountAvailableOnChain(account, chain) &&
          accountService.hasPermissionToMakeActions(account),
      ) ?? null;

    if (payer) return { initiator: payer, target, reason: null };
  }

  if (candidates.length === 0) return { initiator: null, target, reason: 'no-local-account' };
  // Unlock-only and still nobody to pay: the key's own status is irrelevant, the gap is a payer.
  if (isPermissionlessRelease(actions)) return { initiator: null, target, reason: 'no-signer' };
  if (onChain.length === 0) return { initiator: null, target, reason: 'chain-unsupported' };

  const watchOnly = onChain.every((candidate) => accountUtils.isWatchOnlyAccount(candidate));

  return { initiator: null, target, reason: watchOnly ? 'watch-only' : 'no-signer' };
};
