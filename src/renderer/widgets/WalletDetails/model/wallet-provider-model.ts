import { combine } from 'effector';

import { accountUtils, walletModel, accountUtils } from '@renderer/entities/wallet';
import { walletSelectModel } from '@renderer/features/wallets';
import { dictionary, nonNullable } from '@renderer/shared/lib/utils';
import type { Account, Signatory, Wallet, MultisigAccount, BaseAccount } from '@renderer/shared/core';
import { walletConnectModel } from '@renderer/entities/walletConnect';

const $accounts = combine(
  {
    details: walletSelectModel.$walletForDetails,
    accounts: walletModel.$accounts,
  },
  ({ details, accounts }): Account[] => {
    if (!details) return [];

    return accounts.filter((account) => account.walletId === details.id);
  },
);

const $singleShardAccount = combine(
  {
    accounts: walletModel.$accounts,
  },
  ({ accounts }): BaseAccount | undefined => {
    const account = accounts[0];

    return account && accountUtils.isBaseAccount(account) ? account : undefined;
  },
);

const $multisigAccount = combine(
  {
    details: walletSelectModel.$walletForDetails,
    accounts: walletModel.$accounts,
  },
  ({ details, accounts }): MultisigAccount | undefined => {
    if (!details) return undefined;

    const match = accounts.find((account) => account.walletId === details.id);

    return match && accountUtils.isMultisigAccount(match) ? match : undefined;
  },
);

const $signatoryContacts = combine(
  {
    account: $accounts.map((accounts) => accounts[0]),
    accounts: walletModel.$accounts,
    wallets: walletModel.$wallets,
  },
  ({ account, accounts, wallets }): Signatory[] => {
    if (!account || !accountUtils.isMultisigAccount(account)) return [];

    const accountsMap = dictionary(accounts, 'accountId', () => true);

    return account.signatories.filter((signatory) => !accountsMap[signatory.accountId]);
  },
);

const $signatoryWallets = combine(
  {
    account: $accounts.map((accounts) => accounts[0]),
    accounts: walletModel.$accounts,
    wallets: walletModel.$wallets,
  },
  ({ account, accounts, wallets }): Wallet[] => {
    if (!account || !accountUtils.isMultisigAccount(account)) return [];

    const walletsMap = dictionary(wallets, 'id');
    const accountsMap = dictionary(accounts, 'accountId', (account) => account.walletId);

    return account.signatories.map((signatory) => walletsMap[accountsMap[signatory.accountId]]).filter(nonNullable);
  },
);

const $connected = combine($accounts, walletConnectModel.$client, (accounts, client): boolean => {
  const account = accounts[0];
  if (!client || !account || !accountUtils.isWalletConnectAccount(account)) return false;

  const sessions = client?.session.getAll() || [];

  const storedSession = sessions.find((s) => s.topic === accounts[0].signingExtras?.sessionTopic);

  return Boolean(storedSession);
});

export const walletProviderModel = {
  $accounts,
  $singleShardAccount,
  $multisigAccount,
  $signatoryContacts,
  $signatoryWallets,
  $connected,
};
