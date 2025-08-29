import { attach, createStore, sample } from 'effector';
import { combineEvents, spread } from 'patronum';

import {
  AccountType,
  type ChainId,
  CryptoType,
  type FlexibleMultisigAccount,
  type FlexibleMultisigCreated,
  type FlexibleMultisigWallet,
  type FlexibleProxiedAccount,
  type MultisigAccount,
  type MultisigCreated,
  type MultisigWallet,
  type NoID,
  NotificationType,
  type ProxiedAccount,
  type ProxiedConnection,
  type ProxiedWallet,
  type ProxyType,
  SigningType,
  type Wallet,
  WalletType,
} from '@/shared/core';
import { series } from '@/shared/effector';
import {
  entries,
  groupBy,
  isEqual,
  isEthereumAccountId,
  nonNullable,
  nullable,
  toAddress,
  toShortAddress,
} from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { accountSync, accountSyncService, accounts, identity, identityService } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { notificationModel } from '@/entities/notification';
import { proxyUtils } from '@/entities/proxy';
import { type WalletCreateParams, accountUtils, walletModel } from '@/entities/wallet';

const createWalletsFx = attach({ effect: walletModel.createWallets });
const requestIdentitiesFx = attach({ effect: identity.request });
const requestAllIdentitiesFx = series(requestIdentitiesFx, { parallel: true, skipErrors: true });

const identitiesReceived = requestAllIdentitiesFx.doneData.map((maps) => {
  return maps.reduce((acc, map) => ({ ...acc, ...map }), {});
});

const accountsSynced = combineEvents({
  events: [accountSync.syncAccounts.doneData, identitiesReceived],
  reset: accountSync.syncAccounts,
});

const $pending = createStore(false)
  .on(accountSync.syncAccounts, () => true)
  .on(accountSync.syncAccounts.fail, () => false)
  .on(requestAllIdentitiesFx.fail, () => false)
  .on(accountsSynced, () => false);

// TODO
// all code bellow should be moved to specific features

// identity sync

sample({
  clock: accountSync.syncAccounts.doneData,
  fn(accounts) {
    const params: { accounts: AccountId[]; chainId?: ChainId }[] = [];
    const chainGroups = groupBy(accounts, (a) => ('chainId' in a ? a.chainId : 'universal'));

    for (const [chainId, accounts] of entries(chainGroups)) {
      if (nullable(accounts)) continue;

      params.push({
        chainId: chainId === 'universal' ? undefined : chainId,
        accounts: accounts.map((a) => a.accountId),
      });
    }

    return params;
  },
  target: requestAllIdentitiesFx,
});

// proxy sync

sample({
  clock: accountsSynced,
  source: {
    allAccounts: accounts.$list,
    allWallets: walletModel.$allWallets,
    chains: networkModel.$chains,
  },
  fn({ allAccounts, allWallets, chains }, [result, identities]) {
    const syncedProxyAccounts = result.filter(accountSyncService.isSyncedProxyAccount);
    const proxiedAccounts = allAccounts.filter(accountUtils.isProxiedAccount);

    const createWallets: WalletCreateParams<ProxiedAccount, ProxiedWallet>[] = [];
    const updateAccounts: ProxiedAccount[] = [];

    const deleteWallets = new Set<Wallet>();
    const deleteAccounts = new Set(proxiedAccounts);

    const proxiedGroups = groupBy(syncedProxyAccounts, (a) => a.accountId);

    for (const [proxiedAccountId, syncAccounts] of entries(proxiedGroups)) {
      if (nullable(syncAccounts)) continue;

      const chainGroups = groupBy(syncAccounts, (a) => a.chainId);

      for (const [chainId, chainAccounts] of entries(chainGroups)) {
        if (nullable(chainAccounts)) continue;

        const firstAccount = chainAccounts.at(0);
        if (nullable(firstAccount)) continue;

        const chain = chains[chainId];
        if (nullable(chain)) continue;

        const connections: ProxiedConnection[] = chainAccounts
          .map((x) => ({
            delay: x.delay,
            proxyAccountId: x.proxyAccountId,
            // TODO replace ProxyType with KitchensinkRuntimeProxyType
            proxyType: x.proxyType as ProxyType,
          }))
          .toSorted((a, b) => a.proxyAccountId.localeCompare(b.proxyAccountId));

        const existingProxiedAccount = proxiedAccounts.find(
          (a) => a.accountId === proxiedAccountId && a.chainId === chainId,
        );

        if (existingProxiedAccount) {
          // updating

          deleteAccounts.delete(existingProxiedAccount);

          const existingConnections = existingProxiedAccount.connections.toSorted((a, b) =>
            a.proxyAccountId.localeCompare(b.proxyAccountId),
          );

          if (
            isEqual(existingConnections, connections) &&
            isEqual(existingProxiedAccount.deposit, firstAccount.deposit.toString())
          ) {
            continue;
          }

          updateAccounts.push({
            ...existingProxiedAccount,
            connections,
            deposit: firstAccount.deposit.toString(),
          });
        } else {
          // creating new wallet

          const identity = identities[proxiedAccountId];
          const name = identity
            ? identityService.getFullName(identity)
            : proxyUtils.getProxiedName(
                {
                  accountId: proxiedAccountId,
                  proxyVariant: firstAccount.proxyVariant,
                  connections,
                },
                chain.addressPrefix,
              );

          createWallets.push({
            wallet: {
              name,
              type: WalletType.PROXIED,
            },
            accounts: [
              {
                name,
                type: 'chain',
                accountType: AccountType.PROXIED,
                accountId: proxiedAccountId,
                chainId: firstAccount.chainId,
                proxyVariant: firstAccount.proxyVariant,
                cryptoType: isEthereumAccountId(proxiedAccountId) ? CryptoType.ETHEREUM : CryptoType.SR25519,
                signingType: SigningType.WATCH_ONLY,
                deposit: firstAccount.deposit.toString(),
                connections,
              },
            ],
          });
        }
      }
    }

    for (const account of deleteAccounts) {
      const wallet = allWallets.find((w) => w.id === account.walletId);
      if (wallet) {
        deleteWallets.add(wallet);
      }
    }

    return {
      createWallets,
      deleteWallets: Array.from(deleteWallets).map((w) => w.id),
      updateAccounts,
    };
  },
  target: spread({
    createWallets: createWalletsFx,
    deleteWallets: walletModel.walletsRemoved,
    updateAccounts: accounts.updateAccounts,
  }),
});

// multisig sync

sample({
  clock: accountsSynced,
  source: {
    allAccounts: accounts.$list,
    allWallets: walletModel.$allWallets,
  },
  fn({ allAccounts, allWallets }, [result, identities]) {
    const syncedMultisigAccounts = result.filter(accountSyncService.isSyncedMultisigAccount);
    const multisigAccounts = allAccounts.filter(accountUtils.isMultisigAccount);

    const createWallets: WalletCreateParams<MultisigAccount, MultisigWallet>[] = [];

    const deleteWallets = new Set<Wallet>();
    const deleteAccounts = new Set(multisigAccounts);

    for (const syncedAccount of syncedMultisigAccounts) {
      const existingMultisigAccount = multisigAccounts.find((a) => a.accountId === syncedAccount.accountId);

      if (existingMultisigAccount) {
        deleteAccounts.delete(existingMultisigAccount);
      } else {
        const identity = identities[syncedAccount.accountId];
        const name = identity
          ? identityService.getFullName(identity)
          : toShortAddress(toAddress(syncedAccount.accountId), 5);

        createWallets.push({
          wallet: {
            name,
            type: WalletType.MULTISIG,
          },
          accounts: [
            {
              name,
              type: 'universal',
              accountType: AccountType.MULTISIG,
              accountId: syncedAccount.accountId,
              threshold: syncedAccount.threshold,
              cryptoType: isEthereumAccountId(syncedAccount.accountId) ? CryptoType.ETHEREUM : CryptoType.SR25519,
              signingType: SigningType.MULTISIG,
              signatories: syncedAccount.signatories.map((accountId) => ({ accountId })),
            },
          ],
        });
      }
    }

    for (const account of deleteAccounts) {
      const wallet = allWallets.find((w) => w.id === account.walletId);
      if (wallet) {
        deleteWallets.add(wallet);
      }
    }

    return {
      createWallets,
      deleteWallets: Array.from(deleteWallets).map((w) => w.id),
    };
  },
  target: spread({
    createWallets: createWalletsFx,
    deleteWallets: walletModel.walletsRemoved,
  }),
});

// flexible multisig sync

sample({
  clock: accountsSynced,
  source: {
    allAccounts: accounts.$list,
    allWallets: walletModel.$allWallets,
  },
  fn({ allAccounts, allWallets }, [result, identities]) {
    const syncedMultisigAccounts = result.filter(accountSyncService.isSyncedMultisigAccount);
    const syncedProxyAccounts = result.filter(accountSyncService.isSyncedProxyAccount);
    const flexibleMultisigAccounts = allAccounts.filter(accountUtils.isFlexibleMultisigAccount);

    const createWallets: WalletCreateParams<
      FlexibleMultisigAccount | FlexibleProxiedAccount,
      FlexibleMultisigWallet
    >[] = [];

    const deleteWallets = new Set<Wallet>();
    const deleteAccounts = new Set(flexibleMultisigAccounts);

    for (const syncedMultisig of syncedMultisigAccounts) {
      const matchingProxies = syncedProxyAccounts.filter((proxy) => proxy.proxyAccountId === syncedMultisig.accountId);

      if (matchingProxies.length === 0) continue;

      const existingFlexibleMultisig = flexibleMultisigAccounts.find(
        (account) => account.accountId === syncedMultisig.accountId,
      );

      if (existingFlexibleMultisig) {
        deleteAccounts.delete(existingFlexibleMultisig);
      } else {
        const identity = identities[syncedMultisig.accountId];
        const name = identity
          ? identityService.getFullName(identity)
          : toShortAddress(toAddress(syncedMultisig.accountId), 5);

        const chainGroups = groupBy(matchingProxies, (proxy) => proxy.chainId);

        for (const [chainId, proxies] of entries(chainGroups)) {
          if (nullable(proxies)) continue;

          const firstProxy = proxies.at(0);
          if (nullable(firstProxy)) continue;

          const multisigAccount: Omit<FlexibleMultisigAccount, 'id' | 'walletId'> = {
            name,
            type: 'chain',
            accountType: AccountType.FLEX_MULTISIG,
            accountId: syncedMultisig.accountId,
            chainId: chainId,
            threshold: syncedMultisig.threshold,
            cryptoType: isEthereumAccountId(syncedMultisig.accountId) ? CryptoType.ETHEREUM : CryptoType.SR25519,
            signingType: SigningType.WATCH_ONLY,
            signatories: syncedMultisig.signatories.map((accountId) => ({ accountId })),
          };

          const proxyAccount: Omit<FlexibleProxiedAccount, 'id' | 'walletId'> = {
            ...firstProxy,
            name,
            type: 'chain',
            accountType: AccountType.FLEX_PROXIED,
            cryptoType: isEthereumAccountId(firstProxy.accountId) ? CryptoType.ETHEREUM : CryptoType.SR25519,
            signingType: SigningType.WATCH_ONLY,
            deposit: firstProxy.deposit.toString(),
          };

          createWallets.push({
            wallet: {
              name,
              type: WalletType.FLEXIBLE_MULTISIG,
            },
            accounts: [proxyAccount, multisigAccount],
          });
        }
      }
    }

    for (const account of deleteAccounts) {
      const wallet = allWallets.find((w) => w.id === account.walletId);
      if (wallet) {
        deleteWallets.add(wallet);
      }
    }

    return {
      createWallets,
      deleteWallets: Array.from(deleteWallets).map((w) => w.id),
    };
  },
  target: spread({
    createWallets: createWalletsFx,
    deleteWallets: walletModel.walletsRemoved,
  }),
});

// notifications

sample({
  clock: createWalletsFx.doneData,
  fn: (drafts) => {
    const notifications = drafts.flatMap(({ wallet, accounts }) => {
      return accounts.map((account) => {
        if (accountUtils.isMultisigAccount(account)) {
          return {
            read: false,
            type: NotificationType.MULTISIG_CREATED,
            dateCreated: Date.now(),
            multisigAccountId: account.accountId,
            multisigAccountName: account.name,
            signatories: account.signatories.map((signatory) => signatory.accountId),
            threshold: account.threshold,
          } satisfies NoID<MultisigCreated>;
        }

        if (accountUtils.isFlexibleMultisigAccount(account)) {
          return {
            read: false,
            walletId: wallet.id,
            type: NotificationType.FLEXIBLE_MULTISIG_CREATED,
            dateCreated: Date.now(),
            multisigAccountId: account.accountId,
            multisigAccountName: account.name,
            signatories: account.signatories.map((signatory) => signatory.accountId),
            threshold: account.threshold,
          } satisfies NoID<FlexibleMultisigCreated>;
        }

        return null;
      });
    });

    return notifications.filter(nonNullable);
  },
  target: notificationModel.events.notificationsAdded,
});

export const sync = {
  syncAccounts: accountSync.syncAccounts,
  $pending,
};
