import { combine } from 'effector';
import { createGate } from 'effector-react';
import { isEmpty } from 'lodash';
import uniqBy from 'lodash/uniqBy';

import {
  type AccountId,
  type ChainId,
  type ProxyAccount,
  type ProxyGroup,
  type Signatory,
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

const $signatoryContacts = combine(
  {
    account: $multisigAccount,
    wallets: walletModel.$wallets,
    contacts: contactModel.$contacts,
  },
  ({ account, wallets, contacts }): Signatory[] => {
    if (nullable(account)) return [];

    const contactsMap = dictionary(contacts, 'accountId');
    const signatoriesMap = dictionary(account.signatories, 'accountId');
    const allSignatories = walletUtils.getAccountsBy(wallets, ({ accountId }) => signatoriesMap[accountId]);
    const signatoriesSet = new Set(allSignatories.map((signatory) => signatory.accountId));

    return account.signatories
      .filter((signatory) => !signatoriesSet.has(signatory.accountId))
      .map((signatory) => ({ ...signatory, name: contactsMap[signatory.accountId]?.name }));
  },
);

const $signatoryWallets = combine(
  {
    account: $multisigAccount,
    wallets: walletModel.$wallets,
  },
  ({ account, wallets }): [AccountId, Wallet][] => {
    if (nullable(account)) return [];

    const signatoriesMap = dictionary(account.signatories, 'accountId', () => true);

    const walletsAndAccounts = walletUtils.getWalletsFilteredAccounts(wallets, {
      accountFn: (a) => signatoriesMap[a.accountId],
    });

    if (!walletsAndAccounts) return [];

    return walletsAndAccounts.map((wallet) => [wallet.accounts[0].accountId, wallet]);
  },
);

const $signatoryAccounts = combine(
  {
    account: $multisigAccount,
    wallets: walletModel.$wallets,
  },
  ({ account, wallets }): Signatory[] => {
    if (nullable(account)) return [];

    const signatoriesMap = dictionary(account.signatories, 'accountId');
    const allSignatories = walletUtils.getAccountsBy(wallets, ({ accountId }) => signatoriesMap[accountId]);
    const uniqueSignatories = uniqBy(allSignatories, 'accountId');
    const uniqueSignatoriesMap = dictionary(uniqueSignatories, 'accountId');

    return account.signatories
      .filter((signatory) => uniqueSignatoriesMap[signatory.accountId])
      .map((signatory) => ({ ...signatory, name: uniqueSignatoriesMap[signatory.accountId]?.name }));
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
  $signatoryContacts,
  $signatoryWallets,
  $signatoryAccounts,

  $chainsProxies,
  $walletProxyGroups,
  $proxyWallet,
  $hasProxies,
  $canCreateProxy,
};
