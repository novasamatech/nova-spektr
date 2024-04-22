import uniqBy from 'lodash/uniqBy';

import { Account, Wallet, ChainId, Chain, ID, MultisigAccount } from '@shared/core';
import { accountUtils, walletUtils } from '@entities/wallet';
import { dictionary } from '@shared/lib/utils';
import { SubAccounts } from './types';

export const balanceSubUtils = {
  getSiblingAccounts,
  formSubAccounts,
};

function getSiblingAccounts(wallet: Wallet, wallets: Wallet[]): Account[] {
  if (walletUtils.isMultisig(wallet)) {
    const signatoriesMap = dictionary(wallet.accounts[0].signatories, 'accountId');
    const signatories = walletUtils.getAccountsBy(wallets, (account) => signatoriesMap[account.accountId]);

    return wallet.accounts.concat(uniqBy(signatories, 'accountId') as MultisigAccount[]);
  }

  if (walletUtils.isPolkadotVault(wallet)) {
    return wallet.accounts.filter((account) => !accountUtils.isBaseAccount(account));
  }

  if (walletUtils.isProxied(wallet)) {
    const proxiedAccount = wallet.accounts[0];

    const proxy = walletUtils.getWalletAndAccounts(wallets, {
      walletFn: (wallet) => !walletUtils.isWatchOnly(wallet),
      accountFn: (account) => account.accountId === proxiedAccount.proxyAccountId,
    });

    if (!proxy) return [proxiedAccount];

    return [proxiedAccount, ...getSiblingAccounts(proxy.wallet, wallets)];
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

    chainsToUpdate.forEach((chainId) => {
      if (!acc[chainId]) {
        acc[chainId] = { [walletId]: [account.accountId] };
      } else if (acc[chainId][walletId]) {
        acc[chainId][walletId].push(account.accountId);
      } else {
        acc[chainId][walletId] = [account.accountId];
      }
    });

    return acc;
  }, {});

  return chainIds.reduce<SubAccounts>((acc, chainId) => {
    acc[chainId] = { ...subAccounts[chainId], ...newSubAccounts[chainId] };

    return acc;
  }, {});
}
