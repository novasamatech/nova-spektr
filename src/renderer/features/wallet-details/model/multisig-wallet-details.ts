import { combine } from 'effector';
import { createGate } from 'effector-react';

import { type ChainId, type Contact, type ProxyAccount, type Wallet } from '@/shared/core';
import { dictionary, keys, nullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { contactModel } from '@/entities/contact';
import { networkModel } from '@/entities/network';
import { proxyModel, proxyUtils } from '@/entities/proxy';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';

const flow = createGate<{ wallet: Wallet | null }>({ defaultState: { wallet: null } });

const $wallet = flow.state.map(({ wallet }) => wallet);

const $multisigAccount = $wallet.map(wallet => {
  if (nullable(wallet) || !walletUtils.isMultisig(wallet)) return null;

  return wallet.accounts
    .filter(account => accountUtils.isMultisigAccount(account) || accountUtils.isFlexibleMultisigAccount(account))
    .at(0);
});

const $signatories = combine(
  {
    account: $multisigAccount,
    wallets: walletModel.$wallets,
    contacts: contactModel.$contacts,
  },
  ({ account, wallets, contacts }): { wallets: [Wallet, AccountId][]; contacts: Contact[]; people: AccountId[] } => {
    if (!account) {
      return { wallets: [], contacts: [], people: [] };
    }

    const signatoriesMap = dictionary(account.signatories, 'accountId', true);

    const walletSignatories: [Wallet, AccountId][] = [];
    for (const wallet of wallets) {
      for (const account of wallet.accounts) {
        if (!signatoriesMap[account.accountId]) continue;

        delete signatoriesMap[account.accountId];
        walletSignatories.push([wallet, account.accountId]);
      }
    }

    const contactSignatories: Contact[] = [];
    for (const contact of contacts) {
      if (!signatoriesMap[contact.accountId]) continue;

      contactSignatories.push(contact);
      delete signatoriesMap[contact.accountId];
    }

    return {
      wallets: walletSignatories,
      contacts: contactSignatories,
      people: keys(signatoriesMap),
    };
  },
);

const $chainsProxies = combine(
  {
    wallet: $wallet,
    chains: networkModel.$chains,
    proxies: proxyModel.$proxies,
  },
  ({ wallet, chains, proxies }): Record<ChainId, ProxyAccount[]> => {
    if (nullable(wallet)) return {};

    return proxyUtils.getProxyAccountsOnChain(wallet.accounts, keys(chains), proxies);
  },
);

const $hasProxies = combine($chainsProxies, chainsProxies => {
  return Object.values(chainsProxies).some(accounts => accounts.length > 0);
});

export const multisigWalletDetailsModel = {
  flow,
  $signatories,

  $chainsProxies,
  $hasProxies,
};
