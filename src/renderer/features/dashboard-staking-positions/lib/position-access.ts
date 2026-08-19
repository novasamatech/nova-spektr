import { type Wallet } from '@/shared/core';
import { nullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount } from '@/domains/network';
import { accountUtils, walletUtils } from '@/entities/wallet';
import { isSignerAccount } from '@/features/signing-path';

import { type MultisigThreshold, type PositionAccessMode } from './types';

/**
 * Which of the four ways the user can act on `account`.
 *
 * The order below is the order of certainty, not of preference: a missing
 * account and a key we cannot sign with are facts, while "this multisig is
 * ours" depends on the rest of the installation and is therefore decided last.
 *
 * Both the row's own account and the accounts it may be signed through are
 * judged by `isSignerAccount`, the signing-path graph's own definition, rather
 * than a local restatement of it: this function decides whether an action is
 * offered, and the graph decides whether a signing path exists behind it. When
 * the two disagree the user is left with a button that leads nowhere, or — as
 * happened with the wallet-level watch-only guard this file used to carry — no
 * button for an operation the flow would have completed.
 *
 * A multisig is resolved one level deep — a signatory that is itself a foreign
 * multisig does not make the parent signable here. Nested multisig reachability
 * lives in the signing-path graph; a dashboard row does not need to re-derive
 * it, and pretending otherwise would be a guess.
 *
 * `signerAccountIds` is passed in rather than derived here, for two reasons. It
 * is the same set for every row, and this runs once per row of a table and once
 * per account of the KPI selection — rebuilding it inside would make the work
 * quadratic in the size of the wallet. And it has to come from the account
 * domain's own list: the accounts hanging off `Wallet` are a deprecated mirror
 * of it, and `useChainHasSigner` — the rule this one has to agree with — reads
 * the domain list. Two signer sets from two sources is the drift this whole
 * file exists to avoid. Build it with `collectSignerAccountIds`.
 */
export function getAccessMode(
  account: AnyAccount | null | undefined,
  wallets: Wallet[],
  signerAccountIds: ReadonlySet<AccountId>,
): PositionAccessMode {
  // No local account at all — the address is known only from the address book.
  if (nullable(account)) return 'draft';

  // Contact multisigs carry a sentinel wallet id, so the lookup misses by
  // design and lands here rather than pretending the wallet went missing.
  const wallet = walletUtils.getWalletById(wallets, account.walletId);
  if (nullable(wallet)) return 'draft';

  if (!isSignerAccount(account)) return 'watchOnly';

  if (accountUtils.isAnyMultisigAccount(account)) {
    return account.signatories.some((signatory) => signerAccountIds.has(signatory.accountId)) ? 'multisig' : 'draft';
  }

  if (accountUtils.isProxiedAccount(account)) {
    // A proxied account is only as signable as the proxies it delegates to.
    return account.connections.some((connection) => signerAccountIds.has(connection.proxyAccountId))
      ? 'direct'
      : 'draft';
  }

  return 'direct';
}

/** `2 of 3` chip data, `null` for anything that is not a multisig. */
export function getMultisigThreshold(account: AnyAccount | null | undefined): MultisigThreshold | null {
  if (nullable(account) || !accountUtils.isAnyMultisigAccount(account)) return null;

  return { threshold: account.threshold, signatories: account.signatories.length };
}

/** Whether the account may be offered signing actions at all. */
export function canAct(mode: PositionAccessMode): boolean {
  return mode !== 'watchOnly';
}
