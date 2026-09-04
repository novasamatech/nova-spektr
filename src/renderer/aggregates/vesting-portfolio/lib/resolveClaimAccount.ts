import { type Chain } from '@/shared/core';
import {
  type AnyAccount,
  type SigningAccountResolution,
  type SigningBlockReason,
  accountService,
} from '@/domains/network';

/**
 * Why a key with vested tokens still cannot claim them here. Same four verdicts
 * every signer lookup produces — see `SigningBlockReason`.
 */
export type ClaimBlockReason = SigningBlockReason;

export type ClaimAccountResolution = SigningAccountResolution;

/**
 * One key can back several local accounts — a signable wallet plus an
 * auto-discovered proxied wallet, or a WalletConnect wallet carrying one
 * account per chain of its session. Vesting is read per key, so every candidate
 * shows the same schedules, but claiming needs the account that actually
 * reaches a signer on this chain.
 *
 * Nothing about claiming changes that lookup, so it is the shared
 * `accountService.resolveSigningAccount` verbatim — kept as a named function so
 * the vesting call sites read as what they are.
 */
export const resolveClaimAccount = (
  candidates: AnyAccount[],
  chain: Chain,
  allAccounts: AnyAccount[],
): ClaimAccountResolution => accountService.resolveSigningAccount(candidates, chain, allAccounts);
