import { type Chain } from '@/shared/core';
import { type AnyAccount, accountService } from '@/domains/network';
import { accountUtils } from '@/entities/wallet';

/**
 * Why a key with vested tokens still cannot claim them here.
 *
 * - `no-local-account` — a contact, or a key held only by a hidden wallet.
 * - `chain-unsupported` — the wallet holds the key but cannot act on this chain,
 *   e.g. a WalletConnect session paired without it.
 * - `watch-only` — the key is imported for watching only; it never signs.
 * - `no-signer` — the account is on this chain, but nothing signs for it, e.g. a
 *   proxied account whose delegate is not local.
 */
export type ClaimBlockReason = 'no-local-account' | 'chain-unsupported' | 'watch-only' | 'no-signer';

export type ClaimAccountResolution = {
  /**
   * The account to claim with; `null` when `reason` says why that is
   * impossible.
   */
  account: AnyAccount | null;
  reason: ClaimBlockReason | null;
};

/**
 * One key can back several local accounts — a signable wallet plus an
 * auto-discovered proxied wallet, or a WalletConnect wallet carrying one
 * account per chain of its session. Vesting is read per key, so every candidate
 * shows the same schedules, but claiming needs the account that actually
 * reaches a signer on this chain.
 *
 * Prefer the account that signs directly, then one that routes to a signatory
 * (multisig, proxy). When none does, report why, so the UI can say the claim is
 * unavailable instead of silently dropping the button.
 */
export const resolveClaimAccount = (
  candidates: AnyAccount[],
  chain: Chain,
  allAccounts: AnyAccount[],
): ClaimAccountResolution => {
  if (candidates.length === 0) return { account: null, reason: 'no-local-account' };

  const onChain = candidates.filter(account => accountService.isAccountAvailableOnChain(account, chain));
  if (onChain.length === 0) return { account: null, reason: 'chain-unsupported' };

  const account =
    onChain.find(candidate => accountService.hasPermissionToMakeActions(candidate)) ??
    onChain.find(candidate => accountService.findSignatories(candidate, allAccounts, chain).length > 0) ??
    null;

  if (account) return { account, reason: null };

  // Watch-only is the everyday reason nothing signs here, and the user can act
  // on it (re-import the key properly) — name it instead of the generic text.
  const watchOnly = onChain.every(candidate => accountUtils.isWatchOnlyAccount(candidate));

  return { account: null, reason: watchOnly ? 'watch-only' : 'no-signer' };
};
