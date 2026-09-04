import { type ClaimAction } from '@/shared/api/governance';
import { type Chain, type ID } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount, type SigningBlockReason, accountService } from '@/domains/network';
import { isPermissionlessRelease } from '@/features/governance-unlock-flow';

/**
 * Why a locked account cannot be released from here. Same four verdicts every
 * signer lookup produces (see `SigningBlockReason`), read for a release:
 *
 * - `watch-only` — the key never signs and an origin-bound call (`remove_vote`,
 *   `undelegate`) is required.
 * - `no-signer` — nothing local signs for it, and no local payer can release it
 *   permissionlessly.
 */
export type UnlockBlockReason = SigningBlockReason;

/**
 * I18n key spelling out each block reason — shared by the row's tooltip and the
 * widget's click-time verdict.
 */
export const BLOCK_REASON_HINT: Record<UnlockBlockReason, string> = {
  'no-local-account': 'dashboard.governanceLocks.hint.noLocalAccount',
  'chain-unsupported': 'dashboard.governanceLocks.hint.chainUnsupported',
  'watch-only': 'dashboard.governanceLocks.hint.watchOnly',
  'no-signer': 'dashboard.governanceLocks.hint.noSigner',
};

/**
 * Either an initiator, or the reason there is none. The target — the account
 * whose lock is released, the locked account itself — is known either way.
 */
export type UnlockAccountResolution = { target: AccountId } & (
  | { initiator: AnyAccount; reason: null }
  | { initiator: null; reason: UnlockBlockReason }
);

type Params = {
  /** The key whose lock is released. */
  lockedAccountId: AccountId;
  /** Local accounts behind that key (empty for a contact). */
  candidates: AnyAccount[];
  chain: Chain;
  allAccounts: AnyAccount[];
  actions: ClaimAction[];
  /**
   * The wallet whose accounts win a tie — the selected wallet. The same key can
   * live in several wallets, and any signer may pay for a permissionless
   * release; nothing else distinguishes them, and the user cannot change the
   * pick afterwards (the signing path chooses a route _for_ the initiator, not
   * the initiator itself).
   */
  preferredWalletId?: ID | null;
};

/**
 * `convictionVoting.unlock(class, target)` is permissionless; `removeVote` must
 * be signed by the voter. So the locked account signs for itself whenever it
 * can — the shared signer lookup — and a local payer may step in only for an
 * unlock-only release.
 *
 * The payer's balance is not checked here — the flow's fee validation reports
 * an unaffordable fee once the fee is known, and the row cannot know it yet.
 */
export const resolveUnlockAccount = ({
  lockedAccountId,
  candidates,
  chain,
  allAccounts,
  actions,
  preferredWalletId,
}: Params): UnlockAccountResolution => {
  const target = lockedAccountId;

  const { account: own, reason } = accountService.resolveSigningAccount(candidates, chain, allAccounts, {
    preferredWalletId,
  });

  if (own) return { initiator: own, target, reason: null };

  if (isPermissionlessRelease(actions)) {
    const payers = accountService.sortByPreferredWallet(
      accountService.filterAccountsOnChain(allAccounts, chain),
      preferredWalletId,
    );
    const payer =
      payers.find(
        (account) => account.accountId !== lockedAccountId && accountService.hasPermissionToMakeActions(account),
      ) ?? null;

    if (payer) return { initiator: payer, target, reason: null };
  }

  if (reason === 'no-local-account') return { initiator: null, target, reason };
  // Unlock-only and still nobody to pay: the key's own status is irrelevant, the gap is a payer.
  if (isPermissionlessRelease(actions)) return { initiator: null, target, reason: 'no-signer' };

  return { initiator: null, target, reason };
};
