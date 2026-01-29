import { combine } from 'effector';
import { createGate } from 'effector-react';

import { type Contact, type Wallet } from '@/shared/core';
import { dictionary, keys, nullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { contactModel } from '@/entities/contact';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';

import { walletProxiesModel } from './wallet-proxies-model';

const flow = createGate<{ wallet: Wallet | null }>({ defaultState: { wallet: null } });

const $wallet = flow.state.map(({ wallet }) => wallet);

const $multisigAccount = $wallet.map(wallet => {
  if (nullable(wallet) || !walletUtils.isAnyMultisig(wallet)) return null;

  return wallet.accounts.filter(account => accountUtils.isAnyMultisigAccount(account)).at(0);
});

const $signatories = combine(
  {
    multisigAccount: $multisigAccount,
    wallets: walletModel.$wallets,
    contacts: contactModel.$contacts,
  },
  ({
    multisigAccount,
    wallets,
    contacts,
  }): { wallets: [Wallet, AccountId][]; contacts: Contact[]; people: AccountId[] } => {
    if (!multisigAccount) {
      return { wallets: [], contacts: [], people: [] };
    }

    const signatoriesMap = dictionary(multisigAccount.signatories, 'accountId', true);

    const walletSignatories: [Wallet, AccountId][] = [];
    for (const wallet of wallets) {
      for (const account of wallet.accounts) {
        if (!signatoriesMap[multisigAccount.accountId]) continue;

        delete signatoriesMap[multisigAccount.accountId];
        walletSignatories.push([wallet, account.accountId]);
      }
    }

    const contactSignatories: Contact[] = [];
    for (const contact of contacts) {
      if (!signatoriesMap[multisigAccount.accountId]) continue;

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

export const multisigWalletDetailsModel = {
  flow,
  $signatories,

  $chainsProxies: walletProxiesModel.$walletProxies,
  $hasProxies: walletProxiesModel.$hasWalletProxies,
};
