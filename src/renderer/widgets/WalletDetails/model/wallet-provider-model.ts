import { combine } from 'effector';

import { accountUtils, walletModel } from '@renderer/entities/wallet';
import { walletSelectModel } from '@renderer/features/wallets';
import { dictionary, nonNullable } from '@renderer/shared/lib/utils';
import { walletConnectModel } from '@renderer/entities/walletConnect';
import type { MultishardMap } from '../lib/types';
import type {
  Account,
  Signatory,
  Wallet,
  MultisigAccount,
  BaseAccount,
  ChainAccount,
  ChainId,
} from '@renderer/shared/core';

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

const $singleShardAccount = combine(walletModel.$accounts, (accounts): BaseAccount | undefined => {
  const account = accounts[0];

  return account && accountUtils.isBaseAccount(account) ? account : undefined;
});

const $multiShardAccounts = combine($accounts, (accounts): MultishardMap => {
  if (accounts.length === 0) return new Map();

  return accounts.reduce<Map<BaseAccount, Record<ChainId, ChainAccount[]>>>((acc, account) => {
    if (accountUtils.isBaseAccount(account)) {
      acc.set(account, {});
    }

    if (accountUtils.isChainAccount(account)) {
      for (const [baseAccount, chainMap] of acc.entries()) {
        if (baseAccount.id !== account.baseId) continue;

        if (chainMap[account.chainId]) {
          chainMap[account.chainId].push(account);
        } else {
          chainMap[account.chainId] = [account];
        }
        break;
      }
    }

    return acc;
  }, new Map());
});

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
  },
  ({ account, accounts }): Signatory[] => {
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

const $isConnected = combine(
  {
    accounts: $accounts,
    client: walletConnectModel.$client,
  },
  ({ accounts, client }): boolean => {
    const account = accounts[0];
    if (!client || !account || !accountUtils.isWalletConnectAccount(account)) return false;

    const sessions = client.session.getAll() || [];
    const storedSession = sessions.find((s) => s.topic === account.signingExtras?.sessionTopic);

    return Boolean(storedSession);
  },
);

export const walletProviderModel = {
  $accounts,
  $singleShardAccount,
  $multiShardAccounts,
  $multisigAccount,
  $signatoryContacts,
  $signatoryWallets,
  $isConnected,
};
