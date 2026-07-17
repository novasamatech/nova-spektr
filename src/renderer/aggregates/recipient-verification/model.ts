import { combine } from 'effector';

import {
  type RecipientVerificationMode,
  type RecipientWarning,
  resolveRecipientWarning,
} from '@/shared/lib/recipient-verification';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { accounts } from '@/domains/network';
import { contactModel } from '@/entities/contact';
import { authModel, connectionHistoryModel } from '@/aggregates/backend';

// Auth-level health only. Contacts sync-error is deliberately NOT included:
// a stale contact list is still useful for read-only verification, unlike
// descriptions where an unhealthy sync guarantees a failed POST.
const $mode = combine(
  {
    hasEverConnected: connectionHistoryModel.$hasEverConnected,
    isAuthenticated: authModel.$isAuthenticated,
    isSessionExpired: authModel.$isSessionExpired,
    hasNetworkIssue: authModel.$hasNetworkIssue,
  },
  ({ hasEverConnected, isAuthenticated, isSessionExpired, hasNetworkIssue }): RecipientVerificationMode => {
    if (!hasEverConnected) return 'off';

    const isHealthy = isAuthenticated && !isSessionExpired && !hasNetworkIssue;

    return isHealthy ? 'active' : 'unverifiable';
  },
);

// Recipients that never warn: address-book contacts (backend + local) and
// accounts of the user's own wallets. Compared by AccountId, never by SS58.
const $knownAccountIds = combine(contactModel.$contacts, accounts.$list, (contacts, ownAccounts) => {
  const known = new Set<AccountId>();
  for (const contact of contacts) known.add(contact.accountId);
  for (const account of ownAccounts) known.add(account.accountId);

  return known;
});

const $resolveWarning = combine($mode, $knownAccountIds, (mode, knownAccountIds) => {
  return (accountId: AccountId | null): RecipientWarning => resolveRecipientWarning(mode, knownAccountIds, accountId);
});

export const recipientVerificationModel = {
  $mode,
  $resolveWarning,
};
