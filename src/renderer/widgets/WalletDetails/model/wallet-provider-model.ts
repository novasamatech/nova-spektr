import { combine, createEvent, createStore, sample } from 'effector';
import { isEmpty } from 'lodash';
import mapValues from 'lodash/mapValues';
import uniqBy from 'lodash/uniqBy';

import {
  type BaseAccount,
  type ChainId,
  type ProxyAccount,
  type ProxyGroup,
  type Signatory,
  type Wallet,
} from '@/shared/core';
import { dictionary } from '@/shared/lib/utils';
import { contactModel } from '@/entities/contact';
import { networkModel } from '@/entities/network';
import { proxyModel, proxyUtils } from '@/entities/proxy';
import { accountUtils, permissionUtils, walletModel, walletUtils } from '@/entities/wallet';
import { walletSelectModel } from '@/features/wallets';
import { type MultishardMap, type VaultMap } from '../lib/types';
import { walletDetailsUtils } from '../lib/utils';

const removeProxy = createEvent<ProxyAccount>();

const $proxyForRemoval = createStore<ProxyAccount | null>(null);

const $multiShardAccounts = combine(walletSelectModel.$walletForDetails, (wallet): MultishardMap => {
  if (!wallet || !walletUtils.isMultiShard(wallet)) return new Map();

  return walletDetailsUtils.getMultishardMap(wallet.accounts);
});

const $canCreateProxy = combine(walletSelectModel.$walletForDetails, (wallet) => {
  if (!wallet) return false;

  const canCreateAnyProxy = permissionUtils.canCreateAnyProxy(wallet);
  const canCreateNonAnyProxy = permissionUtils.canCreateNonAnyProxy(wallet);

  return canCreateAnyProxy || canCreateNonAnyProxy;
});

type VaultAccounts = {
  root: BaseAccount;
  accountsMap: VaultMap;
};
const $vaultAccounts = combine(
  walletSelectModel.$walletForDetails,
  (wallet): VaultAccounts | undefined => {
    if (!wallet || !walletUtils.isPolkadotVault(wallet)) return undefined;

    const root = accountUtils.getBaseAccount(wallet.accounts);
    const accountsMap = walletDetailsUtils.getVaultAccountsMap(wallet.accounts);

    if (!root || isEmpty(accountsMap)) return undefined;

    return { root, accountsMap };
  },
  { skipVoid: false },
);

const $signatoryContacts = combine(
  {
    wallet: walletSelectModel.$walletForDetails,
    wallets: walletModel.$wallets,
    contacts: contactModel.$contacts,
  },
  ({ wallet, wallets, contacts }): Signatory[] => {
    if (!wallet || !walletUtils.isMultisig(wallet)) return [];
    //TODO: remove it when sign with proxy is supported
    const filteredWallets = wallets.filter((w) => !walletUtils.isWatchOnly(w) && !walletUtils.isProxied(w));

    const contactsMap = dictionary(contacts, 'accountId');
    const signatoriesMap = dictionary(wallet.accounts[0].signatories, 'accountId');
    const allSignatories = walletUtils.getAccountsBy(filteredWallets, ({ accountId }) => signatoriesMap[accountId]);
    const signatoriesSet = new Set(allSignatories.map((signatory) => signatory.accountId));

    return wallet.accounts[0].signatories
      .filter((signatory) => !signatoriesSet.has(signatory.accountId))
      .map((signatory) => ({ ...signatory, name: contactsMap[signatory.accountId]?.name }));
  },
);

// signatoryWallets is used to display details for multi chain multisig
const $signatoryWallets = combine(
  {
    wallet: walletSelectModel.$walletForDetails,
    wallets: walletModel.$wallets,
  },
  ({ wallet, wallets }): Wallet[] => {
    if (!wallet || !walletUtils.isMultisig(wallet)) return [];

    const signatoriesMap = dictionary(wallet.accounts[0].signatories, 'accountId', () => true);

    const walletsAndAccounts = walletUtils.getWalletsFilteredAccounts(wallets, {
      walletFn: (w) =>
        !walletUtils.isWatchOnly(w) &&
        !walletUtils.isProxied(w) &&
        wallet.accounts[0].signatories.some((s) => !s?.id || s.id === w.id),
      accountFn: (a) => signatoriesMap[a.accountId],
    });

    if (!walletsAndAccounts) return [];

    return walletsAndAccounts;
  },
);

// signatoryAccounts is used to display details for single chain multisig
const $signatoryAccounts = combine(
  {
    wallet: walletSelectModel.$walletForDetails,
    wallets: walletModel.$wallets,
  },
  ({ wallet, wallets }): Signatory[] => {
    if (!wallet || !walletUtils.isMultisig(wallet)) return [];
    const filteredWallets = wallets.filter((w) => !walletUtils.isWatchOnly(w) && !walletUtils.isProxied(w));

    const signatoriesMap = dictionary(wallet.accounts[0].signatories, 'accountId');
    const allSignatories = walletUtils.getAccountsBy(filteredWallets, (a) => signatoriesMap[a.accountId]);
    const uniqueSignatories = uniqBy(allSignatories, 'accountId');
    const uniqueSignatoriesMap = dictionary(uniqueSignatories, 'accountId');

    return wallet.accounts[0].signatories
      .filter((signatory) => uniqueSignatoriesMap[signatory.accountId])
      .map((signatory) => ({ ...signatory, name: uniqueSignatoriesMap[signatory.accountId]?.name }));
  },
);

const $chainsProxies = combine(
  {
    wallet: walletSelectModel.$walletForDetails,
    chains: networkModel.$chains,
    proxies: proxyModel.$proxies,
  },
  ({ wallet, chains, proxies }): Record<ChainId, ProxyAccount[]> => {
    if (!wallet) return {};

    const proxiesForAccounts = uniqBy(wallet.accounts, 'accountId').reduce<ProxyAccount[]>((acc, account) => {
      if (proxies[account.accountId]) {
        acc.push(...proxies[account.accountId]);
      }

      return acc;
    }, []);

    const chainsMap = mapValues(chains, () => []) as Record<ChainId, ProxyAccount[]>;

    return proxyUtils.sortAccountsByProxyType(proxiesForAccounts).reduce((acc, proxy) => {
      if (acc[proxy.chainId]) {
        acc[proxy.chainId].push(proxy);
      }

      return acc;
    }, chainsMap);
  },
);

const $walletProxyGroups = combine(
  {
    wallet: walletSelectModel.$walletForDetails,
    chainsProxies: $chainsProxies,
    groups: proxyModel.$walletsProxyGroups,
  },
  ({ wallet, groups }): ProxyGroup[] => {
    if (!wallet || !groups[wallet.id]) return [];

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
    wallet: walletSelectModel.$walletForDetails,
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

sample({
  source: removeProxy,
  target: $proxyForRemoval,
});

export const walletProviderModel = {
  $vaultAccounts,
  $multiShardAccounts,
  $signatoryContacts,
  $signatoryWallets,
  $signatoryAccounts,

  $chainsProxies,
  $walletProxyGroups,
  $proxyWallet,
  $hasProxies,
  $proxyForRemoval,
  $canCreateProxy,

  events: {
    removeProxy,
  },
};
