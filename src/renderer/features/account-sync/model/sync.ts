import { type ApiPromise } from '@polkadot/api';
import { attach, createEffect, createStore, sample } from 'effector';
import { combineEvents, spread } from 'patronum';

import {
  type ChainId,
  type CreateFlexibleMultisigOperationParams,
  type CreateMultisigCreatedParams,
  type CreateNotificationParams,
  type CreateProxyActionParams,
  type FlexibleMultisigAccount,
  type FlexibleMultisigWallet,
  type MultisigAccount,
  type MultisigWallet,
  type NoID,
  type ProxiedAccount,
  type ProxiedConnection,
  type ProxiedWallet,
  type ProxyAccount,
  type ProxyType,
  type Wallet,
  AccountType,
  CryptoType,
  NotificationType,
  SigningType,
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
  truncate,
} from '@/shared/lib/utils';
import { proxyPallet } from '@/shared/pallet/proxy';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import {
  type AccountIdentity,
  type AnyAccount,
  type SyncedAccount,
  accountSync,
  accountSyncService,
  accounts,
  identity,
  identityService,
} from '@/domains/network';
import { networkModel } from '@/entities/network';
import { notificationModel } from '@/entities/notification';
import { proxyModel, proxyUtils } from '@/entities/proxy';
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
  fn(syncResult) {
    const params: { accounts: AccountId[]; chainId?: ChainId }[] = [];
    const chainGroups = groupBy(syncResult.accounts, (a) => ('chainId' in a ? a.chainId : 'universal'));

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

type VerifyProxiedDeletionParams = {
  candidateWalletIds: number[];
  allAccounts: AnyAccount[];
  apis: Record<ChainId, ApiPromise>;
};

/**
 * Before removing proxy wallets from local storage, perform on-chain
 * verification for each candidate account. Only wallets confirmed absent
 * on-chain are deleted.
 *
 * This prevents false deletions caused by indexer lag or incomplete indexer
 * responses. If the API for a chain is unavailable or an error occurs, we
 * conservatively skip deletion for that chain (err on the side of keeping
 * data).
 */
const verifyProxiedDeletionFx = createEffect(
  async ({ candidateWalletIds, allAccounts, apis }: VerifyProxiedDeletionParams): Promise<number[]> => {
    if (candidateWalletIds.length === 0) return [];

    // Find the proxied accounts that correspond to the candidate wallet IDs
    const candidates = allAccounts
      .filter(accountUtils.isProxiedAccount)
      .filter((a) => candidateWalletIds.includes(a.walletId));

    // If we cannot find any matching accounts (unexpected state), fall back to
    // the original list to avoid silently swallowing deletions.
    if (candidates.length === 0) return candidateWalletIds;

    const byChain = groupBy(candidates, (a) => a.chainId);
    const confirmedDeleteWalletIds = new Set<number>();

    for (const [chainId, chainCandidates] of entries(byChain)) {
      if (nullable(chainCandidates)) continue;

      const api = apis[chainId as ChainId];
      if (nullable(api)) {
        // No connected API for this chain — be conservative and skip deletion.
        continue;
      }

      const accountIds = chainCandidates.map((a) => a.accountId);

      try {
        const onChainData = await proxyPallet.storage.proxies(api, accountIds);

        for (const { account: accountId, value } of onChainData) {
          // A proxied account with zero on-chain proxies is truly gone.
          const stillExistsOnChain = value.proxies.length > 0;

          if (!stillExistsOnChain) {
            const candidate = chainCandidates.find((c) => c.accountId === accountId);
            if (candidate) {
              confirmedDeleteWalletIds.add(candidate.walletId);
            }
          }
          // If still present on-chain the indexer was just lagging — keep the wallet.
        }
      } catch (e) {
        // On any RPC error be conservative: skip deletion for this chain.
        console.warn('[proxy-sync] On-chain verification failed for chain', chainId, '— skipping deletion:', e);
      }
    }

    return Array.from(confirmedDeleteWalletIds);
  },
);

export type SyncProxiedParams = {
  allAccounts: AnyAccount[];
  allWallets: Wallet[];
  allChains: Record<ChainId, { addressPrefix?: number }>;
  syncResult: {
    accounts: SyncedAccount[];
    chains: ChainId[];
    indexedBlocks: Map<ChainId, number>;
  };
  identities: Record<AccountId, AccountIdentity>;
};

export const syncProxiedAccounts = ({
  allAccounts,
  allWallets,
  allChains,
  syncResult,
  identities,
}: SyncProxiedParams) => {
  const syncedProxyAccounts = syncResult.accounts.filter(accountSyncService.isSyncedProxyAccount);
  const proxiedAccounts = allAccounts.filter(accountUtils.isProxiedAccount);
  const syncedChains = new Set(syncResult.chains);

  const createWallets: WalletCreateParams<ProxiedAccount, ProxiedWallet>[] = [];
  const updateAccounts: ProxiedAccount[] = [];

  const deleteWallets = new Set<Wallet>();
  const deleteAccounts = new Set(
    proxiedAccounts.filter((account) => {
      if (!syncedChains.has(account.chainId)) {
        return false;
      }

      if (nullable(account.pendingBlockNumber)) {
        return true;
      }

      const lastIndexedBlock = syncResult.indexedBlocks.get(account.chainId);

      // Do not ever delete not indexed accounts
      if (nullable(lastIndexedBlock)) return false;
      return lastIndexedBlock >= account.pendingBlockNumber;
    }),
  );

  const proxiedGroups = groupBy(syncedProxyAccounts, (a) => a.accountId);

  for (const [proxiedAccountId, syncAccounts] of entries(proxiedGroups)) {
    if (nullable(syncAccounts)) continue;

    const chainGroups = groupBy(syncAccounts, (a) => a.chainId);

    for (const [chainId, chainAccounts] of entries(chainGroups)) {
      if (nullable(chainAccounts)) continue;

      const firstAccount = chainAccounts.at(0);
      if (nullable(firstAccount)) continue;

      const chain = allChains[chainId];
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
              entropyBlockNumber: firstAccount.blockNumber,
              extrinsicIndex: firstAccount.extrinsicIndex,
              spawner: firstAccount.spawner,
              createdAt: Date.now(),
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
};

sample({
  clock: accountsSynced,
  source: {
    allAccounts: accounts.$list,
    allWallets: walletModel.$allWallets,
    allChains: networkModel.$chains,
    apis: networkModel.$apis,
  },
  fn({ allAccounts, allWallets, allChains, apis }, [syncResult, identities]) {
    const { createWallets, deleteWallets, updateAccounts } = syncProxiedAccounts({
      allAccounts,
      allWallets,
      allChains,
      syncResult,
      identities,
    });

    return {
      createWallets,
      updateAccounts,
      // Instead of deleting immediately, pass candidates to on-chain verification.
      // walletModel.walletsRemoved is called only after confirmed absence on-chain.
      verifyDeletion: { candidateWalletIds: deleteWallets, allAccounts, apis },
    };
  },
  target: spread({
    createWallets: createWalletsFx,
    updateAccounts: accounts.updateAccounts,
    verifyDeletion: verifyProxiedDeletionFx,
  }),
});

// Only remove wallets that have been confirmed absent on-chain.
sample({
  clock: verifyProxiedDeletionFx.doneData,
  target: walletModel.walletsRemoved,
});

sample({
  clock: accountsSynced,
  source: {
    existingProxies: proxyModel.$proxies,
    chains: networkModel.$chains,
  },
  fn({ chains, existingProxies }, [syncResult]) {
    const syncedProxyAccounts = syncResult.accounts.filter(accountSyncService.isSyncedProxyAccount);
    const syncedChains = new Set(syncResult.chains);
    const proxiesToAdd: NoID<ProxyAccount>[] = [];

    const deleteProxies = new Set<ProxyAccount>(
      Object.values(existingProxies)
        .flat()
        .filter((proxy) => syncedChains.has(proxy.chainId) && syncResult.indexedBlocks.has(proxy.chainId)),
    );

    for (const proxyAccount of syncedProxyAccounts) {
      const chain = chains[proxyAccount.chainId];
      if (nullable(chain)) continue;

      const existingProxy = Array.from(deleteProxies).find(
        (p) =>
          p.accountId === proxyAccount.proxyAccountId &&
          p.proxiedAccountId === proxyAccount.accountId &&
          p.chainId === proxyAccount.chainId,
      );

      if (existingProxy) {
        deleteProxies.delete(existingProxy);
      } else {
        proxiesToAdd.push({
          accountId: proxyAccount.proxyAccountId,
          proxiedAccountId: proxyAccount.accountId,
          chainId: proxyAccount.chainId,
          delay: proxyAccount.delay,
          proxyType: proxyAccount.proxyType as ProxyType,
        });
      }
    }

    return {
      proxiesToAdd,
      proxiesToRemove: Array.from(deleteProxies),
    };
  },
  target: spread({
    proxiesToAdd: proxyModel.events.proxiesAdded,
    proxiesToRemove: proxyModel.events.proxiesRemoved,
  }),
});

// multisig sync

export type SyncMultisigParams = {
  allAccounts: AnyAccount[];
  allWallets: Wallet[];
  syncResult: {
    accounts: SyncedAccount[];
    chains: ChainId[];
    indexedBlocks: Map<ChainId, number>;
  };
  identities: Record<AccountId, AccountIdentity>;
};

export const syncMultisigAccounts = ({ allAccounts, allWallets, syncResult, identities }: SyncMultisigParams) => {
  const syncedMultisigAccounts = syncResult.accounts.filter(accountSyncService.isSyncedMultisigAccount);
  const multisigAccounts = allAccounts.filter(accountUtils.isMultisigAccount);
  const syncedChains = new Set(syncResult.chains);

  const createWallets: WalletCreateParams<MultisigAccount, MultisigWallet>[] = [];

  const deleteWallets = new Set<Wallet>();
  const deleteAccounts = new Set(
    syncedChains.size > 0
      ? multisigAccounts.filter((account) => {
          if (!account.remarkChainId || !account.blockNumber) return true;

          const lastIndexedBlock = syncResult.indexedBlocks.get(account.remarkChainId);

          // Do not ever delete not indexed accounts
          if (nullable(lastIndexedBlock)) return false;
          return lastIndexedBlock >= account.blockNumber;
        })
      : [],
  );

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
            createdAt: Date.now(),
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
};

sample({
  clock: accountsSynced,
  source: {
    allAccounts: accounts.$list,
    allWallets: walletModel.$allWallets,
  },
  fn({ allAccounts, allWallets }, [syncResult, identities]) {
    return syncMultisigAccounts({
      allAccounts,
      allWallets,
      syncResult,
      identities,
    });
  },
  target: spread({
    createWallets: createWalletsFx,
    deleteWallets: walletModel.walletsRemoved,
  }),
});

// flexible multisig sync

export type SyncFlexibleMultisigParams = {
  allAccounts: AnyAccount[];
  allWallets: Wallet[];
  allChains: Record<ChainId, { addressPrefix?: number }>;
  syncResult: {
    accounts: SyncedAccount[];
    chains: ChainId[];
    indexedBlocks: Map<ChainId, number>;
  };
  identities: Record<AccountId, AccountIdentity>;
};

export const syncFlexibleMultisigs = ({
  allAccounts,
  allWallets,
  allChains,
  syncResult,
  identities,
}: SyncFlexibleMultisigParams) => {
  const syncedMultisigAccounts = syncResult.accounts.filter(accountSyncService.isSyncedMultisigAccount);
  const syncedProxyAccounts = syncResult.accounts.filter(accountSyncService.isSyncedProxyAccount);
  const flexibleMultisigAccounts = allAccounts.filter(accountUtils.isFlexibleMultisigAccount);
  const syncedChains = new Set(syncResult.chains);

  const createWallets: WalletCreateParams<FlexibleMultisigAccount, FlexibleMultisigWallet>[] = [];

  const deleteWallets = new Set<Wallet>();
  const deleteAccounts = new Set(
    flexibleMultisigAccounts.filter((account) => {
      if (!syncedChains.has(account.chainId)) return false;

      if (!account.pendingBlockNumber) return true;

      const lastIndexedBlock = syncResult.indexedBlocks.get(account.chainId);

      // Do not ever delete not indexed accounts
      if (nullable(lastIndexedBlock)) return false;
      return lastIndexedBlock >= account.pendingBlockNumber;
    }),
  );

  for (const syncedMultisig of syncedMultisigAccounts) {
    const matchingProxies = syncedProxyAccounts.filter((proxy) =>
      accountSyncService.isFlexibleMultisigPair(proxy, syncedMultisig),
    );

    for (const matchedSyncedProxy of matchingProxies) {
      const existingFlexibleMultisig = flexibleMultisigAccounts.find(
        (flexMulAcc) =>
          flexMulAcc.accountId === matchedSyncedProxy.accountId &&
          flexMulAcc.proxyType === matchedSyncedProxy.proxyType &&
          flexMulAcc.multisigAccountId === syncedMultisig.accountId,
      );

      if (existingFlexibleMultisig) {
        deleteAccounts.delete(existingFlexibleMultisig);
      } else {
        const proxiedIdentity = identities[matchedSyncedProxy.accountId];
        const chain = allChains[matchedSyncedProxy.chainId];
        const proxiedName = proxiedIdentity
          ? identityService.getFullName(proxiedIdentity)
          : toShortAddress(toAddress(matchedSyncedProxy.accountId, { prefix: chain?.addressPrefix }), 5);

        const newFlexibleMultisigAccount: Omit<FlexibleMultisigAccount, 'id' | 'walletId'> = {
          accountType: AccountType.FLEX_MULTISIG,
          type: 'chain',
          chainId: matchedSyncedProxy.chainId,
          name: proxiedName,
          accountId: matchedSyncedProxy.accountId,

          multisigAccountId: syncedMultisig.accountId,
          threshold: syncedMultisig.threshold,
          signatories: syncedMultisig.signatories.map((accountId) => ({ accountId })),

          proxyType: matchedSyncedProxy.proxyType as ProxyType,
          deposit: matchedSyncedProxy.deposit.toString(),
          entropyBlockNumber: matchedSyncedProxy.blockNumber,
          extrinsicIndex: matchedSyncedProxy.extrinsicIndex,

          cryptoType: isEthereumAccountId(matchedSyncedProxy.accountId) ? CryptoType.ETHEREUM : CryptoType.SR25519,
          signingType: SigningType.MULTISIG,
          createdAt: Date.now(),
        };

        createWallets.push({
          wallet: {
            name: proxiedName,
            type: WalletType.FLEXIBLE_MULTISIG,
          },
          accounts: [newFlexibleMultisigAccount],
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
};

sample({
  clock: accountsSynced,
  source: {
    allAccounts: accounts.$list,
    allWallets: walletModel.$allWallets,
    allChains: networkModel.$chains,
  },
  fn({ allAccounts, allWallets, allChains }, [syncResult, identities]) {
    return syncFlexibleMultisigs({
      allAccounts,
      allWallets,
      allChains,
      syncResult,
      identities,
    });
  },
  target: spread({
    createWallets: createWalletsFx,
    deleteWallets: walletModel.walletsRemoved,
  }),
});

// notifications

const createNotificationsFromWallets = (
  wallets: { wallet: { id: number; name: string }; accounts: AnyAccount[] }[],
  chains: Record<ChainId, { addressPrefix?: number }>,
): CreateNotificationParams[] => {
  return wallets
    .flatMap(({ wallet, accounts }) => {
      return accounts.map((account) => {
        if (accountUtils.isAnyMultisigAccount(account)) {
          const chainId = accountUtils.isFlexibleMultisigAccount(account) ? account.chainId : account.remarkChainId;
          const chain = chainId ? chains[chainId] : undefined;
          const address = truncate(toAddress(account.accountId, { prefix: chain?.addressPrefix }));
          const name = wallet.name || address;

          const baseNotification = {
            status: 'info' as const,
            issuer: account.accountId,
            multisigAccountId: account.accountId,
            signatories: account.signatories.map((signatory) => signatory.accountId),
            threshold: account.threshold,
          };

          if (accountUtils.isFlexibleMultisigAccount(account)) {
            return {
              key: `${NotificationType.FLEXIBLE_MULTISIG_CREATED}:${account.chainId}:${account.accountId}:${wallet.id}`,
              ...baseNotification,
              walletId: wallet.id,
              type: NotificationType.FLEXIBLE_MULTISIG_CREATED,
              chainId: account.chainId,
              title: 'Flexible multisig wallet added',
              description: `${name} with threshold ${account.threshold} out of ${account.signatories.length}`,
              accountId: account.accountId,
              accountName: account.name,
              batch: {
                title: 'notifications.toast.batch.flexibleMultisigWalletsAdded',
                description: 'notifications.toast.batch.walletsAddedDescription',
              },
            } satisfies CreateFlexibleMultisigOperationParams;
          }

          if (accountUtils.isMultisigAccount(account)) {
            return {
              key: `${NotificationType.MULTISIG_CREATED}:${account.remarkChainId}:${account.accountId}:${wallet.id}`,
              ...baseNotification,
              type: NotificationType.MULTISIG_CREATED,
              chainId: account.remarkChainId!,
              title: 'Multisig wallet added',
              description: `${name} with threshold ${account.threshold} out of ${account.signatories.length}`,
              multisigAccountName: account.name,
              batch: {
                title: 'notifications.toast.batch.multisigWalletsAdded',
                description: 'notifications.toast.batch.walletsAddedDescription',
              },
            } satisfies CreateMultisigCreatedParams;
          }
        }

        if (accountUtils.isProxiedAccount(account)) {
          const chain = chains[account.chainId];

          return account.connections.map((connection) => {
            const proxiedAddress = truncate(toAddress(account.accountId, { prefix: chain?.addressPrefix }));

            return {
              key: `${NotificationType.PROXY_CREATED}:${account.chainId}:${connection.proxyAccountId}:${account.accountId}:${wallet.id}`,
              chainId: account.chainId,
              proxyType: connection.proxyType,
              proxyAccountId: connection.proxyAccountId,
              proxyVariant: account.proxyVariant,
              proxiedAccountId: account.accountId,
              type: NotificationType.PROXY_CREATED,
              status: 'info',
              issuer: connection.proxyAccountId,
              title: 'Delegated authority wallet added',
              description: `${connection.proxyType} for ${account.proxyVariant} ${proxiedAddress}`,
              batch: {
                title: 'notifications.toast.batch.delegatedAuthorityWalletsAdded',
                description: 'notifications.toast.batch.walletsAddedDescription',
              },
            } satisfies CreateProxyActionParams;
          });
        }

        return null;
      });
    })
    .flat()
    .filter(nonNullable);
};

sample({
  clock: createWalletsFx.doneData,
  source: networkModel.$chains,
  fn: (chains, wallets) => createNotificationsFromWallets(wallets, chains),
  target: notificationModel.events.notificationsAdded,
});

sample({
  clock: walletModel.createWallet.doneData,
  source: networkModel.$chains,
  filter: (_, result) => nonNullable(result),
  fn: (chains, result) => createNotificationsFromWallets([result!], chains),
  target: notificationModel.events.notificationsAdded,
});

export const sync = {
  syncAccounts: accountSync.syncAccounts,
  $pending,

  /** Exposed only for testing — do not use in production code. */
  _test: {
    verifyProxiedDeletionFx,
  },
};
