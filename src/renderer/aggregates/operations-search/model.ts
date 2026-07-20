import { combine } from 'effector';

import { accounts, identity } from '@/domains/network';
import { contactModel } from '@/entities/contact';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';

import { type AccountNameSources, createSearchResolvers } from './lib/account-name';

/**
 * Everything `accountService.resolveAccountName` needs, in one store, so both
 * the Effector-side operations filter and the React-side drafts filter resolve
 * display names from exactly the same inputs.
 */
export const $accountNameSources = combine(
  {
    accounts: accounts.$list,
    contacts: contactModel.$contacts,
    identities: identity.$list,
    chains: networkModel.$chains,
  },
  (sources): AccountNameSources => sources,
);

/**
 * The resolvers, rebuilt only when their sources change — so their memo caches
 * survive across keystrokes, which is where the repeated work actually is.
 */
export const $searchResolvers = combine(
  { sources: $accountNameSources, wallets: walletModel.$wallets },
  ({ sources, wallets }) => createSearchResolvers(sources, wallets),
);
