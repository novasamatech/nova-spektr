import { Account, Wallet, ChainId, Chain } from '@shared/core';
import { accountUtils, walletUtils } from '@entities/wallet';
import { dictionary } from '@shared/lib/utils';
import { SubAccounts } from './types';

export const balanceSubUtils = {
  getAccountsToSubscribe,
  getNewAccounts,
};

function getAccountsToSubscribe(wallet: Wallet, walletAccounts: Account[], accounts?: Account[]): Account[] {
  if (walletUtils.isMultisig(wallet) && accountUtils.isMultisigAccount(walletAccounts[0]) && accounts) {
    const accountsMap = dictionary(accounts, 'accountId');

    return walletAccounts[0].signatories.reduce((acc, signatory) => {
      if (accountsMap[signatory.accountId]) {
        acc.push(accountsMap[signatory.accountId]);
      }

      return acc;
    }, walletAccounts);
  }

  if (walletUtils.isPolkadotVault(wallet)) {
    return walletAccounts.filter((account) => !accountUtils.isBaseAccount(account));
  }

  return walletAccounts;
}

function getNewAccounts(
  subAccounts: SubAccounts,
  accountsToSub: Account[],
  chains: Record<ChainId, Chain>,
): SubAccounts {
  const chainIds = Object.keys(subAccounts) as ChainId[];

  const newSubAccounts = accountsToSub.reduce<SubAccounts>((acc, account) => {
    const chainsToUpdate = chainIds.filter((chainId) =>
      accountUtils.isChainIdAndCryptoTypeMatch(account, chains[chainId]),
    );

    chainsToUpdate.forEach((chainId) => {
      if (acc[chainId] && acc[chainId][account.walletId]) {
        acc[chainId][account.walletId].push(account.accountId);
      } else if (acc[chainId]) {
        acc[chainId][account.walletId] = [account.accountId];
      } else {
        acc[chainId] = { [account.walletId]: [account.accountId] };
      }
    });

    return acc;
  }, {});

  return chainIds.reduce<SubAccounts>((acc, chainId) => {
    acc[chainId] = { ...subAccounts[chainId], ...newSubAccounts[chainId] };

    return acc;
  }, {});
}
