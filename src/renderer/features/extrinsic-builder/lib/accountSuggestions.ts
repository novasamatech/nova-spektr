import { uniqBy } from 'lodash';

import { type Address, type Contact } from '@/shared/core';
import { performSearch, toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';

export type ContactOption = {
  /** Row key — unique per contact row; never the user-supplied name. */
  key: string;
  name: string;
  address: Address;
};

type Params = {
  contacts: Contact[];
  searchQuery: string;
  /**
   * Set when the query is itself a valid address — then the match is by
   * accountId only.
   */
  queryAccountId: AccountId | null;
  prefix: number | undefined;
};

/**
 * Contact rows for the account suggestion list.
 *
 * `$contacts` is a plain concat of local + backend sources, so the same address
 * can appear twice. Rows collapse by accountId with the local contact winning —
 * the same precedence `resolveAccountName` uses everywhere else. Keys combine
 * source and id: contact names are user-supplied and not unique.
 */
export function buildContactOptions({ contacts, searchQuery, queryAccountId, prefix }: Params): ContactOption[] {
  const unique = uniqBy(contacts, 'accountId');

  const filtered = queryAccountId
    ? unique.filter((contact) => contact.accountId === queryAccountId)
    : performSearch({ query: searchQuery, records: unique, weights: { name: 1, address: 0.5 } });

  return filtered.map((contact) => ({
    key: `${contact.source}-${contact.id}`,
    name: contact.name,
    address: toAddress(contact.accountId, { prefix }),
  }));
}
