import { Account, Wallet, ChainId, ID, AccountId } from '@shared/core';
import { accountUtils, walletUtils } from '@entities/wallet';
import { dictionary } from '@shared/lib/utils';
import { SubAccounts } from './types';

export const balanceSubUtils = {
  getAccountsToSubscribe,
  getNewAccounts,
};

function getAccountsToSubscribe(wallet: Wallet, accounts: Account[]): Account[] {
  if (walletUtils.isMultisig(wallet) && accountUtils.isMultisigAccount(accounts[0])) {
    const accountsMap = dictionary(accounts, 'accountId');

    return accounts[0].signatories.reduce((acc, signatory) => {
      if (accountsMap[signatory.accountId]) {
        acc.push(accountsMap[signatory.accountId]);
      }

      return acc;
    }, accounts);
  }

  if (walletUtils.isPolkadotVault(wallet)) {
    return accounts.filter((account) => !accountUtils.isBaseAccount(account));
  }

  if (walletUtils.isProxied(wallet)) {
    // TODO: Handle proxied accounts https://app.clickup.com/t/86934k047
  }

  return accounts;
}

function getNewAccounts(subAccounts: SubAccounts, accountsToSub: Account[]): SubAccounts {
  const chainIds = Object.keys(subAccounts) as ChainId[];

  const updateChain = (acc: SubAccounts, chainId: ChainId, walletId: ID, accountId: AccountId) => {
    if (acc[chainId]) {
      acc[chainId][walletId].push(accountId);
    } else {
      acc[chainId] = { [walletId]: [accountId] };
    }
  };

  const newSubAccounts = accountsToSub.reduce<SubAccounts>((acc, account) => {
    if (accountUtils.isBaseAccount(account) || accountUtils.isMultisigAccount(account)) {
      chainIds.forEach((chainId) => updateChain(acc, chainId, account.walletId, account.accountId));
    } else {
      updateChain(acc, account.chainId, account.walletId, account.accountId);
    }

    return acc;
  }, {});

  return chainIds.reduce<SubAccounts>((acc, chainId) => {
    acc[chainId] = { ...subAccounts[chainId], ...newSubAccounts[chainId] };

    return acc;
  }, {});
}
