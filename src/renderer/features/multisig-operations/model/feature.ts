import { type ApiPromise } from '@polkadot/api';
import { combine, createStore, sample } from 'effector';
import { keyBy, uniq, uniqBy } from 'lodash';
import { debounce } from 'patronum';

import { type Chain, type ChainId } from '@/shared/core';
import { createFeature } from '@/shared/feature';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { deepLinkService } from '@/domains/app';
import { accountService, accounts, contactMultisigsModel } from '@/domains/network';
import { contactModel } from '@/entities/contact';
import { networkModel, networkUtils } from '@/entities/network';
import { accountUtils } from '@/entities/wallet';

import { deepLinkModel } from './deep-link';
import { $notificationsReady } from './notifications';

// Debounced contact-multisig discovery: wired here (in the feature layer)
// rather than inside the domain module so that `contact-multisigs.ts` has
// no load-time dependency on `@/entities/contact` — which would create a
// module-init cycle via `@/entities/transaction → @/domains/network`.
sample({
  clock: debounce(combine({ contacts: contactModel.$contacts, walletAccounts: accounts.$list }), 500),
  fn: ({ contacts, walletAccounts }) => {
    const accountIds = Array.from(new Set(contacts.map(c => c.accountId)));
    const nameByAccountId = new Map<AccountId, { name: string; contactIds: string[] }>();
    for (const c of contacts) {
      const entry = nameByAccountId.get(c.accountId);
      if (entry) entry.contactIds.push(c.id);
      else nameByAccountId.set(c.accountId, { name: c.name, contactIds: [c.id] });
    }
    const excluded = new Set<AccountId>(
      walletAccounts.filter(accountUtils.isAnyMultisigAccount).map(contactMultisigsModel.resolveMultisigAccountId),
    );
    return { accountIds, excluded, nameByAccountId };
  },
  target: contactMultisigsModel.discoverFx,
});

const $trigger = createStore<string>('');
const $debouncedApis = createStore<Record<ChainId, ApiPromise>>({});

sample({
  clock: debounce(networkModel.$apis, 2000),
  source: networkModel.$chains,
  fn: (chains, apis) => {
    const multisigChains = Object.values(chains)
      .filter(chain => apis[chain.chainId] && networkUtils.isMultisigSupported(chain.options))
      .map(c => c.chainId);

    return multisigChains.join(',');
  },
  target: $trigger,
});

sample({
  clock: $trigger,
  source: networkModel.$apis,
  target: $debouncedApis,
});

const $input = combine(
  {
    apis: $debouncedApis,
    chains: networkModel.$chains,
    connections: networkModel.$connections,
    accounts: accounts.$list,
    contactMultisigs: contactMultisigsModel.$contactMultisigs,
    notificationsReady: $notificationsReady, // initialize notifications binding
  },
  ({ apis, chains, connections, accounts, contactMultisigs }) => {
    const walletMultisigs = accounts.filter(accountUtils.isAnyMultisigAccount);
    const walletIds = new Set<AccountId>(walletMultisigs.map(contactMultisigsModel.resolveMultisigAccountId));
    const externals = contactMultisigs.filter(cm => !walletIds.has(cm.accountId));

    if (walletMultisigs.length === 0 && externals.length === 0) return null;

    const availableChains: Chain[] = [];

    for (const account of walletMultisigs) {
      if (accountService.isChainAccount(account)) {
        const chain = chains[account.chainId];
        if (chain) availableChains.push(chain);
      } else {
        availableChains.push(
          ...Object.values(chains).filter(chain => accountService.isAccountAvailableOnChain(account, chain)),
        );
      }
    }

    // Contact-backed externals are chain-agnostic — subscribe on every
    // multisig-supported chain.
    if (externals.length > 0) {
      for (const chain of Object.values(chains)) {
        if (networkUtils.isMultisigSupported(chain.options)) availableChains.push(chain);
      }
    }

    const uniqueChains = uniqBy(availableChains, 'chainId').filter(chain => {
      const connection = connections[chain.chainId];
      return !connection || networkUtils.isEnabledConnection(connection);
    });
    const availableApis: Record<ChainId, ApiPromise> = {};
    for (const chain of uniqueChains) {
      const api = apis[chain.chainId];
      if (api) availableApis[chain.chainId] = api;
    }

    return {
      chains: keyBy(uniqueChains, c => c.chainId),
      apis: availableApis,
      accountIds: uniq([...walletIds, ...externals.map(e => e.accountId)]),
    };
  },
);

export const multisigOperationsFeature = createFeature({
  name: 'multisig/operations',
  input: $input,
});

deepLinkService.registerHandler(deepLinkModel.multisigOperationDeepLinkHandler);
