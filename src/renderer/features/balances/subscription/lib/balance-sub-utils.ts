import { Account, Wallet, ChainId, Chain } from '@shared/core';
import { accountUtils, walletUtils } from '@entities/wallet';
import { dictionary } from '@shared/lib/utils';
import { SubAccounts } from './types';

export const balanceSubUtils = {
  getAccountsToSubscribe,
  getNewAccounts,
};

function getAccountsToSubscribe(
  wallet: Wallet,
  wallets: Wallet[],
  walletAccounts: Account[],
  accounts: Account[],
): Account[] {
  const firstAccount = walletAccounts[0];

  if (walletUtils.isMultisig(wallet) && accountUtils.isMultisigAccount(firstAccount)) {
    const accountsMap = dictionary(accounts, 'accountId');

    return firstAccount.signatories.reduce((acc, signatory) => {
      if (accountsMap[signatory.accountId]) {
        acc.push(accountsMap[signatory.accountId]);
      }

      return acc;
    }, walletAccounts);
  }

  if (walletUtils.isPolkadotVault(wallet)) {
    return walletAccounts.filter((account) => !accountUtils.isBaseAccount(account));
  }

  if (walletUtils.isProxied(wallet) && accountUtils.isProxiedAccount(firstAccount)) {
    const proxyAccounts = accounts.filter((account) => account.accountId === firstAccount.proxyAccountId);
    const proxyWallet = wallets.find((wallet) => {
      return proxyAccounts.some((a) => a.walletId === wallet.id) && !walletUtils.isWatchOnly(wallet);
    });
    const proxyAccount = proxyAccounts.find((account) => account.walletId === proxyWallet?.id);

    if (!proxyWallet || !proxyAccount) return [firstAccount];

    return [firstAccount, ...getAccountsToSubscribe(proxyWallet, wallets, [proxyAccount], accounts)];
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
    const chainsToUpdate = chainIds.filter((chainId) => accountUtils.isChainAndCryptoMatch(account, chains[chainId]));

    chainsToUpdate.forEach((chainId) => {
      if (!acc[chainId]) {
        acc[chainId] = { [account.walletId]: [account.accountId] };
      } else if (acc[chainId][account.walletId]) {
        acc[chainId][account.walletId].push(account.accountId);
      } else {
        acc[chainId][account.walletId] = [account.accountId];
      }
    });

    return acc;
  }, {});

  return chainIds.reduce<SubAccounts>((acc, chainId) => {
    acc[chainId] = { ...subAccounts[chainId], ...newSubAccounts[chainId] };

    return acc;
  }, {});
}
