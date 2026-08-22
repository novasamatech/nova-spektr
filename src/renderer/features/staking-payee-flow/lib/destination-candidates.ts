import { type Contact } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount } from '@/domains/network';

/**
 * One entry of the payout-account picker.
 *
 * Wallet accounts carry their account object (the view resolves the name and
 * the wallet badge from it); address-book entries carry the contact name and no
 * account at all.
 */
export type DestinationCandidate = {
  /** `account:<id>` for a wallet account, `contact:<accountId>` for a contact. */
  id: string;
  accountId: AccountId;
  account: AnyAccount | null;
  /** Contact name; `null` for a wallet account. */
  name: string | null;
};

type Params = {
  accounts: AnyAccount[];
  contacts: Contact[];
  /** Listed first — paying rewards to the stash itself is the common case. */
  positionAccountId: AccountId | null;
  /** Injected rather than imported: the chain checks go through DI registries. */
  isAccountOnChain: (account: AnyAccount) => boolean;
  isContactOnChain: (accountId: AccountId) => boolean;
};

/**
 * The position's own account first, then the rest of the wallet accounts in
 * list order, then the address book — each key once, a wallet account winning
 * over a contact for the same key.
 */
export function buildDestinationCandidates({
  accounts,
  contacts,
  positionAccountId,
  isAccountOnChain,
  isContactOnChain,
}: Params): DestinationCandidate[] {
  const seen = new Set<AccountId>();
  const candidates: DestinationCandidate[] = [];

  const addAccount = (account: AnyAccount) => {
    if (seen.has(account.accountId) || !isAccountOnChain(account)) return;

    seen.add(account.accountId);
    candidates.push({ id: `account:${account.id}`, accountId: account.accountId, account, name: null });
  };

  for (const account of accounts) {
    if (account.accountId === positionAccountId) addAccount(account);
  }
  for (const account of accounts) {
    addAccount(account);
  }

  for (const contact of contacts) {
    if (seen.has(contact.accountId) || !isContactOnChain(contact.accountId)) continue;

    seen.add(contact.accountId);
    candidates.push({
      id: `contact:${contact.accountId}`,
      accountId: contact.accountId,
      account: null,
      name: contact.name,
    });
  }

  return candidates;
}
