import { combine } from 'effector';
import { createGate } from 'effector-react';
import { isEmpty } from 'lodash';

import {
  type AccountId,
  type ChainId,
  type Contact,
  type ProxyAccount,
  type ProxyGroup,
  type Wallet,
} from '@/shared/core';
import { dictionary, nullable } from '@/shared/lib/utils';
import { contactModel } from '@/entities/contact';
import { networkModel } from '@/entities/network';
import { proxyModel, proxyUtils } from '@/entities/proxy';
import { accountUtils, permissionUtils, walletModel, walletUtils } from '@/entities/wallet';
import { walletDetailsUtils } from '../lib/utils';

const flow = createGate<{ wallet: Wallet | null }>({ defaultState: { wallet: null } });

const $wallet = flow.state.map(({ wallet }) => wallet);

const $multiShardAccounts = $wallet.map((wallet) => {
  if (nullable(wallet) || !walletUtils.isMultiShard(wallet)) return new Map();

  return walletDetailsUtils.getMultishardMap(wallet.accounts);
});

const $canCreateProxy = $wallet.map((wallet) => {
  if (nullable(wallet)) return false;

  const canCreateAnyProxy = permissionUtils.canCreateAnyProxy(wallet);
  const canCreateNonAnyProxy = permissionUtils.canCreateNonAnyProxy(wallet);

  return canCreateAnyProxy || canCreateNonAnyProxy;
});

const $vaultAccounts = $wallet.map((wallet) => {
  if (!wallet || !walletUtils.isPolkadotVault(wallet)) return null;

  const root = accountUtils.getBaseAccount(wallet.accounts);
  const accountsMap = walletDetailsUtils.getVaultAccountsMap(wallet.accounts);

  if (!root || isEmpty(accountsMap)) return null;

  return { root, accountsMap };
});

const $multisigAccount = $wallet.map((wallet) => {
  if (nullable(wallet) || !walletUtils.isMultisig(wallet)) return null;

  return wallet.accounts.at(0) ?? null;
});

const $signatories = combine(
  {
    account: $multisigAccount,
    wallets: walletModel.$wallets,
    contacts: contactModel.$contacts,
  },
  ({ account, wallets, contacts }): { wallets: [Wallet, AccountId][]; contacts: Contact[]; people: AccountId[] } => {
    if (!account) {
      return { wallets: [], contacts: [], people: [] };
    }

    const signatoriesMap = dictionary(account.signatories, 'accountId', true);

    const walletSignatories: [Wallet, AccountId][] = [];
    for (const wallet of wallets) {
      if (walletUtils.isWatchOnly(wallet)) continue;

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
      people: Object.keys(signatoriesMap) as AccountId[],
    };
  },
);

const $chainsProxies = combine(
  {
    wallet: $wallet,
    chains: networkModel.$chains,
    proxies: proxyModel.$proxies,
  },
  ({ wallet, chains, proxies }): Record<ChainId, ProxyAccount[]> => {
    if (nullable(wallet)) return {};

    return proxyUtils.getProxyAccountsOnChain(wallet.accounts, Object.keys(chains) as ChainId[], proxies);
  },
);

const $walletProxyGroups = combine(
  {
    wallet: $wallet,
    chainsProxies: $chainsProxies,
    groups: proxyModel.$walletsProxyGroups,
  },
  ({ wallet, groups }): ProxyGroup[] => {
    if (nullable(wallet) || nullable(groups[wallet.id])) return [];

    // TODO: Find why it can be doubled sometimes https://github.com/novasamatech/nova-spektr/issues/1655
    const walletGroups = groups[wallet.id];
    const filteredGroups = walletGroups.reduceRight(
      (acc, group) => {
        const id = `${group.chainId}_${group.proxiedAccountId}_${group.walletId}`;

        if (!acc[id]) {
          acc[id] = group;
        }

        return acc;
      },
      {} as Record<string, ProxyGroup>,
    );

    return Object.values(filteredGroups);
  },
);

const $proxyWallet = combine(
  {
    wallet: $wallet,
    wallets: walletModel.$wallets,
  },
  ({ wallet, wallets }): Wallet | null => {
    if (!wallet || !walletUtils.isProxied(wallet)) return null;

    return walletUtils.getWalletFilteredAccounts(wallets, {
      walletFn: (w) => !walletUtils.isWatchOnly(w),
      accountFn: (a) => a.accountId === wallet.accounts[0].proxyAccountId,
    });
  },
);

const $hasProxies = combine($chainsProxies, (chainsProxies) => {
  return Object.values(chainsProxies).some((accounts) => accounts.length > 0);
});

export const walletDetailsModel = {
  flow,

  $vaultAccounts,
  $multiShardAccounts,
  $signatories,

  $chainsProxies,
  $walletProxyGroups,
  $proxyWallet,
  $hasProxies,
  $canCreateProxy,
};
