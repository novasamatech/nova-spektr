import { Account, Wallet } from '@shared/core';
import { accountUtils, walletUtils } from '@entities/wallet';
import { dictionary } from '@shared/lib/utils';

export const balanceSubUtils = {
  getAccountsToSubscribe,
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
