import { type Chain, type ID, type Wallet } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount } from '@/domains/network';

import { isEligibleInitiator } from './initiator-eligibility';

export type DefaultInitiatorParams = {
  /** Accounts the operation would rather run from, most preferred first. */
  preferred: AccountId[];
  chain: Chain;
  accounts: AnyAccount[];
  wallets: Wallet[];
  /** The wallet open in wallet management — `null` when none is. */
  selectedWalletId: ID | null;
};

export type DefaultInitiator = { account: AnyAccount; wallet: Wallet };

/**
 * Who an origin-free operation runs from before the user picks anybody.
 *
 * The operation's own preference wins when one of its accounts is a key we
 * hold; then the wallet the user is looking at; then any key at all. Every
 * candidate passes `isEligibleInitiator`, so the default is always one the
 * picker would offer.
 */
export function pickDefaultInitiator({
  preferred,
  chain,
  accounts,
  wallets,
  selectedWalletId,
}: DefaultInitiatorParams): DefaultInitiator | null {
  const eligible: DefaultInitiator[] = [];
  for (const account of accounts) {
    const wallet = wallets.find((w) => w.id === account.walletId);
    if (wallet && isEligibleInitiator(account, wallet, chain)) eligible.push({ account, wallet });
  }

  for (const accountId of preferred) {
    const own = eligible.find((candidate) => candidate.account.accountId === accountId);
    if (own) return own;
  }

  return eligible.find((candidate) => candidate.wallet.id === selectedWalletId) ?? eligible[0] ?? null;
}
