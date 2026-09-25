import { type Contact, type LocalContact, isLocalContact } from '@/shared/core';
import { isGeneratedAccountName, toAccountId, toAddress } from '@/shared/lib/utils';
import { type AnyAccount } from '@/domains/network';

type SignatoryDraft = {
  name: string;
  address: string;
  walletId?: string;
};

type Params = {
  /** The first signatory is the signer (an own account) and is never saved. */
  signatories: SignatoryDraft[];
  contacts: Contact[];
  accounts: AnyAccount[];
  /** Prefix of the network the addresses were entered for. */
  addressPrefix?: number;
};

/**
 * Which local contacts a created multisig saves for its external signatories.
 *
 * Only addresses that are not the user's own accounts count as external: an own
 * account already has its name, and its name field auto-fills with the stored
 * account name — for a synced account that is its short address, which as a
 * local contact would hide the address book name everywhere. For the same
 * reason a name that is just the signatory's own short address is never saved.
 * Address book (backend) contacts are read-only here.
 */
export function getSignatoryContactChanges({ signatories, contacts, accounts, addressPrefix }: Params) {
  const ownAccountIds = new Set(accounts.map(account => account.accountId));
  const created: Omit<LocalContact, 'id'>[] = [];
  const updated: LocalContact[] = [];

  for (const { name, address, walletId } of signatories.slice(1)) {
    const accountId = toAccountId(address);
    const trimmedName = name.trim();

    if (walletId || ownAccountIds.has(accountId)) continue;
    if (!trimmedName || isGeneratedAccountName(trimmedName, accountId, addressPrefix)) continue;

    const sameAccountContacts = contacts.filter(contact => contact.accountId === accountId);
    const localContact = sameAccountContacts.find(isLocalContact);

    if (localContact) {
      if (localContact.name !== trimmedName) {
        updated.push({ ...localContact, name: trimmedName });
      }
    } else if (sameAccountContacts.length === 0) {
      created.push({ accountId, address: toAddress(address), name: trimmedName, source: 'local' });
    }
  }

  return { created, updated };
}
