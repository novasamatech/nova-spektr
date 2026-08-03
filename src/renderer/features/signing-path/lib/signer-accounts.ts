import { SigningType } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount } from '@/domains/network';

/**
 * The single definition of "this installation can produce a signature with this
 * account".
 *
 * It is the leaf set the signing-path graph terminates at, so anything that
 * merely _predicts_ whether a path exists — a dashboard deciding to show a
 * Claim button, a KPI tile deciding a network is actionable — has to ask the
 * same question here. A second spelling of the rule drifts, and a screen that
 * hides an action the signing flow would have completed is worse than no screen
 * at all.
 *
 * The verdict lives on the account, not on its wallet, and a wallet-level
 * `walletUtils.isWatchOnly` guard must not be layered on top:
 *
 * - It can never subtract anything. A watch-only wallet has one creation path
 *   (`features/watch-only-wallet-pairing`), and it stamps
 *   `SigningType.WATCH_ONLY` on every account it makes; nothing else adds
 *   accounts to such a wallet.
 * - It cannot stand in for this check either. Multisig, proxied and
 *   flexible-multisig wallets are not watch-only, yet routinely hold accounts
 *   nobody can sign with — a proxied account carries `WATCH_ONLY` itself.
 * - It does change the answer as soon as the caller's account list is narrower
 *   than the graph's `accounts.$list`, which is how the two dashboard copies of
 *   this rule ended up stricter than the flow they gate.
 */
export function isSignerAccount(account: AnyAccount): boolean {
  return account.signingType !== SigningType.WATCH_ONLY;
}

/** The signer leaf set of `accounts`, keyed the way the graph looks it up. */
export function collectSignerAccountIds(accounts: AnyAccount[]): Set<AccountId> {
  const result = new Set<AccountId>();

  for (const account of accounts) {
    if (isSignerAccount(account)) {
      result.add(account.accountId);
    }
  }

  return result;
}
