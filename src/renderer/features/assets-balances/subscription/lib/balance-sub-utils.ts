import uniqBy from 'lodash/uniqBy';

import { type Account, type Chain, type ChainId, type ID, type MultisigAccount, type Wallet } from '@/shared/core';
import { dictionary } from '@/shared/lib/utils';
import { accountUtils, walletUtils } from '@/entities/wallet';

import { type SubAccounts } from './types';

export const balanceSubUtils = {
  getSiblingAccounts,
  formSubAccounts,
};

function getSiblingAccounts(wallet: Wallet, wallets: Wallet[], chains: Record<ChainId, Chain>): Account[] {
  if (walletUtils.isMultisig(wallet)) {
    const signatoriesMap = dictionary(wallet.accounts[0].signatories, 'accountId', true);
    const signatories = walletUtils.getAccountsBy(wallets, (account) => signatoriesMap[account.accountId]);

    return wallet.accounts.concat(uniqBy(signatories, 'accountId') as MultisigAccount[]);
  }

  if (walletUtils.isPolkadotVault(wallet)) {
    return wallet.accounts.filter((account) => !accountUtils.isVaultBaseAccount(account));
  }

  if (walletUtils.isProxied(wallet)) {
    const proxiedAccount = wallet.accounts[0];

    const proxy = walletUtils.getWalletFilteredAccounts(wallets, {
      walletFn: (wallet) => !walletUtils.isWatchOnly(wallet),
      accountFn: (account) =>
        account.accountId === proxiedAccount.proxyAccountId &&
        accountUtils.isChainAndCryptoMatch(account, chains[proxiedAccount.chainId]),
    });

    if (!proxy) return [proxiedAccount];

    return [proxiedAccount, ...getSiblingAccounts(proxy, wallets, chains)];
  }

  return wallet.accounts;
}

function formSubAccounts(
  walletId: ID,
  accountsToSub: Account[],
  subAccounts: SubAccounts,
  chains: Record<ChainId, Chain>,
): SubAccounts {
  const chainIds = Object.keys(subAccounts) as ChainId[];

  const newSubAccounts = accountsToSub.reduce<SubAccounts>((acc, account) => {
    const chainsToUpdate = chainIds.filter((chainId) => accountUtils.isChainAndCryptoMatch(account, chains[chainId]));

    for (const chainId of chainsToUpdate) {
      if (!acc[chainId]) {
        acc[chainId] = { [walletId]: [account.accountId] };
      } else if (acc[chainId][walletId]) {
        acc[chainId][walletId].push(account.accountId);
      } else {
        acc[chainId][walletId] = [account.accountId];
      }
    }

    return acc;
  }, {});

  return chainIds.reduce<SubAccounts>((acc, chainId) => {
    acc[chainId] = { ...subAccounts[chainId], ...newSubAccounts[chainId] };

    return acc;
  }, {});
}
