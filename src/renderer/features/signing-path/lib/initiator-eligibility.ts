import { type Chain, type Wallet, WalletType } from '@/shared/core';
import { nullable } from '@/shared/lib/utils';
import { type AnyAccount, accountService } from '@/domains/network';

import { isSignerAccount } from './signer-accounts';

/**
 * Whether one of our own keys may originate an operation on `chain`.
 *
 * Three questions, all of which have to be yes: the account holds a key we can
 * sign with; the chain can hold the account at all; and the wallet the key
 * belongs to can sign at all — a watch-only wallet cannot, whatever its
 * accounts say. Delegated sources (multisigs, proxied accounts) are judged by
 * reachability in the graph instead; this is only for the keys offered as roots
 * in their own right.
 */
export function isEligibleInitiator(account: AnyAccount, wallet: Wallet | null | undefined, chain: Chain): boolean {
  if (nullable(wallet)) return false;
  if (!isSignerAccount(account)) return false;
  if (!accountService.isAccountAvailableOnChain(account, chain)) return false;

  return wallet.type !== WalletType.WATCH_ONLY;
}
