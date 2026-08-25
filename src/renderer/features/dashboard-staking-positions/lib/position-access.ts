import { type ChainId, type Wallet } from '@/shared/core';
import { nullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount } from '@/domains/network';
import { accountUtils, walletUtils } from '@/entities/wallet';
import { isSignerAccount } from '@/features/signing-path';

import { type MultisigThreshold, type PositionAccess, type PositionBlockedReason } from './types';

/**
 * What this installation could do with a draft, already resolved.
 *
 * Resolved once per surface and handed in, rather than read here: it is the
 * same answer for every row, and this runs once per row of a table and once per
 * account of the KPI selection. Both halves come from `features/drafts` — see
 * `useDraftPolicy`, which is where its vocabulary is translated into this one —
 * so that a row and the flow it opens cannot disagree about whether a draft is
 * possible. Handing the answer in also keeps this module free of any runtime
 * dependency on the drafts feature's barrel, which exports the whole draft UI
 * alongside the rule.
 */
export type DraftPolicy = {
  /**
   * `null` when this user can author drafts at all; otherwise the terminal
   * state that stops them, already in this widget's vocabulary.
   */
  blockedReason: Extract<PositionBlockedReason, 'draftsNotConnected' | 'draftsNoPermission'> | null;
  /** Whether a draft may start at this address on this chain at all. */
  isDraftSource: (accountId: AccountId, chainId: ChainId) => boolean;
};

const blocked = (reason: PositionBlockedReason): PositionAccess => ({ mode: 'blocked', reason });
const allowed = (mode: 'direct' | 'multisig' | 'draft'): PositionAccess => ({ mode });

/**
 * Whether the operation could leave as a draft, and what to say when it cannot.
 *
 * **Availability is answered before the address**, and the order matters more
 * than it looks. The source set is the graph's roots intersected with the
 * external address book, so with no address book connected it is empty for
 * every address alike — and reading that emptiness as a fact about the address
 * told a never-connected user that their contact "has no multisig or proxy that
 * could sign for it", which is untrue and points them at nothing they can do.
 * Whether an address could carry a draft is simply unknowable until there is a
 * book to look it up in, so the connection and the permission are reported
 * first — `policy.blockedReason` is exactly that verdict, decided by the drafts
 * feature and translated once per surface.
 */
function resolveDraftAccess(accountId: AccountId, chainId: ChainId, policy: DraftPolicy): PositionAccess {
  if (policy.blockedReason !== null) return blocked(policy.blockedReason);

  if (!policy.isDraftSource(accountId, chainId)) return blocked('noDraftRoute');

  return allowed('draft');
}

/**
 * What the user may do with `account`, and why not when the answer is nothing.
 *
 * Both the row's own account and the accounts it may be signed through are
 * judged by `isSignerAccount`, the signing-path graph's own definition, rather
 * than a local restatement of it: this function decides whether an action is
 * offered, and the graph decides whether a signing path exists behind it. When
 * the two disagree the user is left with a button that leads nowhere, or — as
 * happened with the wallet-level watch-only guard this file used to carry — no
 * button for an operation the flow would have completed.
 *
 * **The order of the checks below is load-bearing.** Account kind is decided
 * before the key, because a delegating account never holds one of its own: a
 * proxied account is stamped `SigningType.WATCH_ONLY` at every creation site,
 * so a signer check placed first swallows the whole category and reports a
 * proxied position as watch-only — hiding every action from a user who holds
 * the proxy.
 *
 * A multisig is resolved one level deep — a signatory that is itself a foreign
 * multisig does not make the parent signable here. Nested multisig reachability
 * lives in the signing-path graph; a dashboard row does not need to re-derive
 * it, and pretending otherwise would be a guess.
 *
 * `signerAccountIds` is passed in rather than derived here, for the same reason
 * `draftPolicy` is: it is the same set for every row, and it has to come from
 * the account domain's own list — the accounts hanging off `Wallet` are a
 * deprecated mirror of it, and `useChainHasSigner`, the rule this one has to
 * agree with, reads the domain list. Build it with `collectSignerAccountIds`.
 */
export type PositionAccessParams = {
  /** The local account behind the address, `null` for an address-book row. */
  account: AnyAccount | null | undefined;
  /** The row's own address — needed even when no local account holds it. */
  accountId: AccountId;
  /** The row's network: a proxy edge exists on one chain and not on another. */
  chainId: ChainId;
  wallets: Wallet[];
  signerAccountIds: ReadonlySet<AccountId>;
  draftPolicy: DraftPolicy;
};

export function getPositionAccess({
  account,
  accountId,
  chainId,
  wallets,
  signerAccountIds,
  draftPolicy,
}: PositionAccessParams): PositionAccess {
  // No local account at all — the address is known only from the address book.
  if (nullable(account)) return resolveDraftAccess(accountId, chainId, draftPolicy);

  // Contact multisigs carry a sentinel wallet id, so the lookup misses by
  // design and lands here rather than pretending the wallet went missing.
  const wallet = walletUtils.getWalletById(wallets, account.walletId);
  if (nullable(wallet)) return resolveDraftAccess(accountId, chainId, draftPolicy);

  if (accountUtils.isAnyMultisigAccount(account)) {
    const hasLocalSignatory = account.signatories.some((signatory) => signerAccountIds.has(signatory.accountId));

    return hasLocalSignatory ? allowed('multisig') : resolveDraftAccess(accountId, chainId, draftPolicy);
  }

  if (accountUtils.isProxiedAccount(account)) {
    // A proxied account is only as signable as the proxies it delegates to.
    const hasLocalProxy = account.connections.some((connection) => signerAccountIds.has(connection.proxyAccountId));

    return hasLocalProxy ? allowed('direct') : resolveDraftAccess(accountId, chainId, draftPolicy);
  }

  // What is left holds its own key, or holds none at all. A watch-only account
  // is the end of the road: it is one of ours, so there is no draft to hand to
  // anybody, and no permission or connection would change that.
  if (!isSignerAccount(account)) return blocked('watchOnly');

  return allowed('direct');
}

/** `2 of 3` chip data, `null` for anything that is not a multisig. */
export function getMultisigThreshold(account: AnyAccount | null | undefined): MultisigThreshold | null {
  if (nullable(account) || !accountUtils.isAnyMultisigAccount(account)) return null;

  return { threshold: account.threshold, signatories: account.signatories.length };
}
