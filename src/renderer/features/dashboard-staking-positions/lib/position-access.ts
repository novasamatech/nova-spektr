import { type Wallet, SigningType } from '@/shared/core';
import { nullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount } from '@/domains/network';
import { accountUtils, walletUtils } from '@/entities/wallet';

import { type MultisigThreshold, type PositionAccessMode } from './types';

/**
 * Every account of this installation that can actually produce a signature.
 *
 * Mirrors the signing-path graph's own definition (`signingType !==
 * WATCH_ONLY`): the one property that separates a key we hold from an address
 * we merely watch. Wallet type is not enough — a watch-only wallet is the
 * common case, but an individual imported account carries the verdict itself.
 */
function collectSignerAccountIds(wallets: Wallet[]): Set<AccountId> {
  const signers = new Set<AccountId>();

  for (const wallet of wallets) {
    if (walletUtils.isWatchOnly(wallet)) continue;

    for (const account of wallet.accounts) {
      if (account.signingType === SigningType.WATCH_ONLY) continue;

      signers.add(account.accountId);
    }
  }

  return signers;
}

/**
 * Which of the four ways the user can act on `account`.
 *
 * The order below is the order of certainty, not of preference: a missing
 * account and a watch-only wallet are facts, while "this multisig is ours"
 * depends on the rest of the installation and is therefore decided last.
 *
 * A multisig is resolved one level deep — a signatory that is itself a foreign
 * multisig does not make the parent signable here. Nested multisig reachability
 * lives in the signing-path graph; a dashboard row does not need to re-derive
 * it, and pretending otherwise would be a guess.
 */
export function getAccessMode(account: AnyAccount | null | undefined, wallets: Wallet[]): PositionAccessMode {
  // No local account at all — the address is known only from the address book.
  if (nullable(account)) return 'draft';

  // Contact multisigs carry a sentinel wallet id, so the lookup misses by
  // design and lands here rather than pretending the wallet went missing.
  const wallet = walletUtils.getWalletById(wallets, account.walletId);
  if (nullable(wallet)) return 'draft';

  if (walletUtils.isWatchOnly(wallet) || account.signingType === SigningType.WATCH_ONLY) return 'watchOnly';

  const signers = collectSignerAccountIds(wallets);

  if (accountUtils.isAnyMultisigAccount(account)) {
    return account.signatories.some((signatory) => signers.has(signatory.accountId)) ? 'multisig' : 'draft';
  }

  if (accountUtils.isProxiedAccount(account)) {
    // A proxied account is only as signable as the proxies it delegates to.
    return account.connections.some((connection) => signers.has(connection.proxyAccountId)) ? 'direct' : 'draft';
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
