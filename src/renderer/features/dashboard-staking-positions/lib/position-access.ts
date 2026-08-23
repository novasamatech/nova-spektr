import { type ChainId, type Wallet } from '@/shared/core';
import { nullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount } from '@/domains/network';
import { accountUtils, walletUtils } from '@/entities/wallet';
import { type DraftAvailability, canStartDraft } from '@/features/drafts';
import { isSignerAccount } from '@/features/signing-path';

import { type MultisigThreshold, type PositionAccess, type PositionBlockedReason } from './types';

/**
 * What this installation could do with a draft for the address in question.
 *
 * Resolved once per surface and handed in, rather than read here: it is the
 * same answer for every row, and this runs once per row of a table and once per
 * account of the KPI selection. It also has to come from the drafts feature
 * itself — `useDraftAvailability` and `useDraftSources` — so that a row and the
 * flow it opens cannot disagree about whether a draft is possible.
 */
export type DraftPolicy = {
  availability: DraftAvailability;
  /** Whether a draft may start at this address on this chain at all. */
  isDraftSource: (accountId: AccountId, chainId: ChainId) => boolean;
};

const blocked = (reason: PositionBlockedReason): PositionAccess => ({ mode: 'blocked', reason });
const allowed = (mode: 'direct' | 'multisig' | 'draft'): PositionAccess => ({ mode, reason: null });

/**
 * Whether the operation could leave as a draft, and what to say when it cannot.
 *
 * Two independent facts, and the address one comes first: a plain contact with
 * no multisig and no proxy can never be a draft source, so connecting an
 * address book or being granted a permission would change nothing for it. Only
 * once the address _could_ carry a draft is it worth telling the user about a
 * connection or a permission they might go and fix.
 */
function resolveDraftAccess(accountId: AccountId, chainId: ChainId, policy: DraftPolicy): PositionAccess {
  if (!policy.isDraftSource(accountId, chainId)) return blocked('noDraftRoute');

  // `canStartDraft` rather than a second reading of the same states: it is the
  // drafts feature's own answer, and `DraftModeCard` hides itself by exactly
  // this rule. `offline` passes it — the address book was connected before, the
  // card carries its own reconnect prompt, and refusing at the dashboard would
  // hide the one control that fixes it.
  if (!canStartDraft(policy.availability)) {
    return blocked(policy.availability === 'noPermission' ? 'draftsNoPermission' : 'draftsNotConnected');
  }

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
export function getPositionAccess(
  account: AnyAccount | null | undefined,
  accountId: AccountId,
  chainId: ChainId,
  wallets: Wallet[],
  signerAccountIds: ReadonlySet<AccountId>,
  draftPolicy: DraftPolicy,
): PositionAccess {
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

/** Whether the account may be offered signing actions at all. */
export function canAct(access: PositionAccess): boolean {
  return access.mode !== 'blocked';
}
