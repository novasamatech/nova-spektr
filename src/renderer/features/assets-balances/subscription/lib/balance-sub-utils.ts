import { type Chain, type ChainId, type ID } from '@/shared/core';
import { dictionary } from '@/shared/lib/utils';
import { type AnyAccount } from '@/domains/network';
import { accountUtils } from '@/entities/wallet';

import { type SubAccounts } from './types';

export const balanceSubUtils = {
  getSiblingAccounts,
  formSubAccounts,
};

function getSiblingAccounts(
  selectedAccounts: AnyAccount[],
  accounts: AnyAccount[],
  chains: Record<ChainId, Chain>,
): AnyAccount[] {
  const multisigAccount = selectedAccounts.find(accountUtils.isMultisigAccount);

  if (multisigAccount) {
    const signatoriesMap = dictionary(multisigAccount.signatories, 'accountId', true);
    const signatories = accounts.filter((account) => signatoriesMap[account.accountId]);

    return selectedAccounts.concat(signatories);
  }

  const polkadotAccount = selectedAccounts.find(accountUtils.isVaultShardAccount || accountUtils.isVaultChainAccount);

  if (polkadotAccount) {
    return selectedAccounts.filter((account) => !accountUtils.isBaseAccount(account));
  }

  const proxiedAccount = selectedAccounts.find(accountUtils.isProxiedAccount);
  if (proxiedAccount) {
    const proxy = accounts.filter(
      (account) =>
        !accountUtils.isWatchOnlyAccount(account) &&
        account.accountId === proxiedAccount.proxyAccountId &&
        accountUtils.isChainAndCryptoMatch(account, chains[proxiedAccount.chainId]),
    );

    if (!proxy) return [proxiedAccount];

    return [proxiedAccount, ...getSiblingAccounts(proxy, accounts, chains)];
  }

  return selectedAccounts;
}

function formSubAccounts(
  walletId: ID,
  accountsToSub: AnyAccount[],
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
