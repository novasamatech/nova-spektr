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

type SignatoriesData = { wallets: [Wallet, AccountId][]; contacts: Contact[]; people: AccountId[] };

const emptySignatories: SignatoriesData = { wallets: [], contacts: [], people: [] };

function computeSignatories(
  multisigAccount: { signatories: { accountId: AccountId }[] },
  wallets: Wallet[],
  contacts: Contact[],
): SignatoriesData {
  const signatoriesMap = dictionary(multisigAccount.signatories, 'accountId', true);

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
}

const $signatories = combine(
  {
    multisigAccount: $multisigAccount,
    wallets: walletModel.$wallets,
    contacts: contactModel.$contacts,
  },
  ({ multisigAccount, wallets, contacts }): SignatoriesData => {
    if (!multisigAccount) {
      return emptySignatories;
    }

    return computeSignatories(multisigAccount, wallets, contacts);
  },
);

const $multisigAccounts = $wallet.map(wallet => {
  if (nullable(wallet) || !walletUtils.isAnyMultisig(wallet)) return [];

  return wallet.accounts.filter(account => accountUtils.isAnyMultisigAccount(account));
});

const $signatoriesMap = combine(
  {
    multisigAccounts: $multisigAccounts,
    wallets: walletModel.$wallets,
    contacts: contactModel.$contacts,
  },
  ({ multisigAccounts, wallets, contacts }): Record<string, SignatoriesData> => {
    const result: Record<string, SignatoriesData> = {};

    for (const multisigAccount of multisigAccounts) {
      result[multisigAccount.id] = computeSignatories(multisigAccount, wallets, contacts);
    }

    return result;
  },
);

export const multisigWalletDetailsModel = {
  flow,
  $signatories,
  $signatoriesMap,

  $chainsProxies: walletProxiesModel.$walletProxies,
  $hasProxies: walletProxiesModel.$hasWalletProxies,
};
