import { combine } from 'effector';

import { accounts, identity } from '@/domains/network';
import { contactModel } from '@/entities/contact';
import { networkModel } from '@/entities/network';

import { type AccountNameSources } from './lib/account-name';

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
