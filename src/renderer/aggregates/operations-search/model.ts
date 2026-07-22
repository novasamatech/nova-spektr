import { combine } from 'effector';

import { accounts, identity } from '@/domains/network';
import { contactModel } from '@/entities/contact';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';

import { type AccountNameSources, createSearchResolvers } from './lib/account-name';

// One store, so the Effector-side operations filter and the React-side drafts
// filter resolve names from identical inputs.
export const $accountNameSources = combine(
  {
    accounts: accounts.$list,
    contacts: contactModel.$contacts,
    identities: identity.$list,
    chains: networkModel.$chains,
  },
  (sources): AccountNameSources => sources,
);

// A store rather than a per-search call, so the memo caches survive keystrokes.
export const $searchResolvers = combine(
  { sources: $accountNameSources, wallets: walletModel.$wallets },
  ({ sources, wallets }) => createSearchResolvers(sources, wallets),
);
