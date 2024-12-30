import { combine, createEffect, createEvent, createStore, sample } from 'effector';
import { GraphQLClient } from 'graphql-request';
import { uniq } from 'lodash';
import { interval } from 'patronum';

import { storageService } from '@/shared/api/storage';
import {
  type Account,
  AccountType,
  type Chain,
  type ChainId,
  ExternalType,
  type FlexibleMultisigAccount,
  type FlexibleMultisigCreated,
  type FlexibleMultisigWallet,
  type MultisigAccount,
  type MultisigCreated,
  type MultisigWallet,
  type NoID,
  NotificationType,
  type ProxiedAccount,
  type ProxyAccount,
  SigningType,
  WalletType,
} from '@/shared/core';
import { series } from '@/shared/effector';
import { nonNullable, nullable, toAddress } from '@/shared/lib/utils';
import { networkModel, networkUtils } from '@/entities/network';
import { notificationModel } from '@/entities/notification';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { multisigService } from '../api';
import { multisigUtils } from '../lib/mulitisigs-utils';

const MULTISIG_DISCOVERY_TIMEOUT = 30000;

const subscribe = createEvent();
const request = createEvent<Account[]>();

const $multisigAccounts = walletModel.$allWallets
  .map(walletUtils.getAllAccounts)
  .map((accounts) => accounts.filter(accountUtils.isMultisigAccount));

const { tick: pollingRequest } = interval({
  start: subscribe,
  timeout: MULTISIG_DISCOVERY_TIMEOUT,
});

const updateRequested = sample({
  clock: [pollingRequest, networkModel.events.connectionsPopulated],
  source: walletModel.$allWallets,
  fn: (wallets) => {
    const filteredWallets =
      walletUtils.getWalletsFilteredAccounts(wallets, {
        walletFn: (w) => !walletUtils.isWatchOnly(w) && !walletUtils.isProxied(w) && !walletUtils.isMultisig(w),
      }) ?? [];

    return walletUtils.getAllAccounts(filteredWallets);
  },
});

const $multisigChains = combine(networkModel.$chains, (chains) => {
  return Object.values(chains).filter((chain) => {
    const isMultisigSupported = networkUtils.isMultisigSupported(chain.options);
    const hasIndexerUrl = chain.externalApi?.[ExternalType.PROXY]?.at(0)?.url;

    return isMultisigSupported && hasIndexerUrl;
  });
});

type GetMultisigsParams = {
  chains: Chain[];
  accounts: Account[];
  multisigAccounts: Account[];
  proxies: Record<ChainId, ProxyAccount[]>;
};

type MultisigResponse = {
  type: 'multisig';
  account: NoID<Omit<MultisigAccount, 'walletId'>>;
  chain: Chain;
};

type FlexibleMultisigResponse = {
  type: 'flexibleMultisig';
  account: NoID<Omit<FlexibleMultisigAccount, 'walletId'>>;
  chain: Chain;
};

type GetMultisigResponse = MultisigResponse | FlexibleMultisigResponse;

const getMultisigsFx = createEffect(
  ({ chains, accounts, proxies, multisigAccounts }: GetMultisigsParams): Promise<GetMultisigResponse[]> => {
    const requests = chains.flatMap(async (chain) => {
      const multisigIndexer = networkUtils.getProxyExternalApi(chain);

      if (nullable(multisigIndexer) || accounts.length === 0) return [];

      const client = new GraphQLClient(multisigIndexer.url);
      const accountIds = uniq(
        accounts.filter((a) => accountUtils.isChainIdMatch(a, chain.chainId)).map((account) => account.accountId),
      );

      if (accountIds.length === 0) return [];

      const indexedMultisigs = await multisigService.filterMultisigsAccounts(client, accountIds);

      return (
        indexedMultisigs
          // filter out multisigs that already exists
          .filter((multisigResult) => nullable(multisigAccounts.find((a) => a.accountId === multisigResult.accountId)))
          .map(({ threshold, accountId, signatories }): GetMultisigResponse => {
            // TODO: run a proxy worker for new multisiig since we don't have these proxies at the moment
            const proxiesList = proxies[accountId];

            const proxy = nonNullable(proxiesList)
              ? (proxiesList.find((p) => p.chainId === chain.chainId && p.proxyType === 'Any') ?? null)
              : null;

            // TODO check if there's a multisig with no proxy and only one ongoing operation 'create pure proxy' - build flexible shell
            if (proxy) {
              return {
                type: 'flexibleMultisig',
                account: multisigUtils.buildFlexibleMultisigAccount({
                  threshold,
                  proxyAccountId: proxy.accountId,
                  accountId,
                  signatories,
                  chain,
                }),
                chain,
              };
            }

            return {
              type: 'multisig',
              account: multisigUtils.buildMultisigAccount({ threshold, accountId, signatories, chain }),
              chain,
            };
          })
      );
    });

    return Promise.all(requests).then((res) => res.flat());
  },
);

const populateMultisigWalletFx = createEffect(({ account, chain }: MultisigResponse) => {
  const walletName = toAddress(account.accountId, { chunk: 5, prefix: chain.addressPrefix });
  const wallet: NoID<Omit<MultisigWallet, 'accounts' | 'isActive'>> = {
    name: walletName,
    type: WalletType.MULTISIG,
    signingType: SigningType.MULTISIG,
  };

  return {
    wallet,
    accounts: [account],
    external: true,
  };
});

const populateFlexibleMultisigWalletFx = createEffect(({ account, chain }: FlexibleMultisigResponse) => {
  const walletName = toAddress(account.accountId, { chunk: 5, prefix: chain.addressPrefix });
  const wallet: NoID<Omit<FlexibleMultisigWallet, 'accounts' | 'isActive'>> = {
    name: walletName,
    type: WalletType.FLEXIBLE_MULTISIG,
    signingType: SigningType.MULTISIG,
    activated: false,
  };

  return {
    wallet,
    accounts: [account],
    external: true,
  };
});

sample({
  clock: [updateRequested, request],
  source: {
    multisigAccounts: $multisigAccounts,
    chains: $multisigChains,
    // TODO uncomment when we're ready to work with flexible multisig.
    // proxies: proxyModel.$proxies,
    proxies: createStore({}),
    connections: networkModel.$connections,
  },
  fn: ({ multisigAccounts, chains, proxies, connections }, accounts) => {
    const filteredChains = chains.filter((chain) => {
      if (nullable(connections[chain.chainId])) return false;

      return !networkUtils.isDisabledConnection(connections[chain.chainId]);
    });

    return {
      chains: filteredChains,
      multisigAccounts,
      accounts,
      proxies,
    };
  },
  target: getMultisigsFx,
});

const populateWallet = createEvent<GetMultisigResponse>();

sample({
  clock: getMultisigsFx.doneData,
  target: series(populateWallet),
});

const populateMultisigWallet = populateWallet.filter({
  fn: (x) => x.type === 'multisig',
});

const populateFlexibleMultisigWallet = populateWallet.filter({
  fn: (x) => x.type === 'flexibleMultisig',
});

sample({
  clock: populateMultisigWallet,
  target: populateMultisigWalletFx,
});

sample({
  clock: populateFlexibleMultisigWallet,
  target: populateFlexibleMultisigWalletFx,
});

sample({
  clock: populateMultisigWalletFx.doneData,
  target: walletModel.events.multisigCreated,
});

sample({
  clock: populateFlexibleMultisigWalletFx.doneData,
  target: walletModel.events.flexibleMultisigCreated,
});

sample({
  clock: walletModel.events.walletCreatedDone,
  filter: ({ wallet }) => wallet.type === WalletType.MULTISIG,
  fn: ({ accounts }) => {
    return accounts.filter(accountUtils.isRegularMultisigAccount).map<NoID<MultisigCreated>>((account) => {
      return {
        read: false,
        type: NotificationType.MULTISIG_CREATED,
        dateCreated: Date.now(),
        multisigAccountId: account.accountId,
        multisigAccountName: account.name,
        chainId: account.chainId,
        signatories: account.signatories.map((signatory) => signatory.accountId),
        threshold: account.threshold,
      };
    });
  },
  target: notificationModel.events.notificationsAdded,
});

sample({
  clock: walletModel.events.walletCreatedDone,
  filter: ({ wallet }) => wallet.type === WalletType.FLEXIBLE_MULTISIG,
  fn: ({ accounts, wallet }) => {
    return accounts.filter(accountUtils.isFlexibleMultisigAccount).map<NoID<FlexibleMultisigCreated>>((account) => {
      return {
        read: false,
        walletId: wallet.id,
        type: NotificationType.FLEXIBLE_MULTISIG_CREATED,
        dateCreated: Date.now(),
        multisigAccountId: account.accountId,
        multisigAccountName: account.name,
        chainId: account.chainId,
        signatories: account.signatories.map((signatory) => signatory.accountId),
        threshold: account.threshold,
      };
    });
  },
  target: notificationModel.events.notificationsAdded,
});

// Bond flexible multisig with proxy
const $flexibleWithProxy = createStore<FlexibleMultisigWallet | null>(null);

sample({
  clock: walletModel.events.walletCreatedDone,
  source: walletModel.$wallets,
  filter: (_, { accounts }) => {
    const account = accounts.at(0);

    return nonNullable(account) && account.type === AccountType.PROXIED && account.proxyType === 'Any';
  },
  fn: (wallets, { accounts }) => {
    const account = accounts.at(0)! as ProxiedAccount;

    const proxiedWallet = walletUtils.getWalletFilteredAccounts(wallets, {
      walletFn: (w) => walletUtils.isFlexibleMultisig(w),
      accountFn: (a) => a.accountId === account.proxyAccountId,
    }) as FlexibleMultisigWallet | null;

    if (!proxiedWallet) return null;

    // Proxy accountId or entire account?
    return {
      ...proxiedWallet,
      accounts: proxiedWallet.accounts.map((acc) => ({ ...acc, proxyAccountId: account.accountId })),
    };
  },
  target: $flexibleWithProxy,
});

type UpdateAccounts = { walletId: number; accounts: Account[] };
const updateAccountsFx = createEffect(async ({ walletId, accounts }: UpdateAccounts): Promise<UpdateAccounts> => {
  await storageService.accounts.updateAll(accounts);

  return { walletId, accounts };
});

sample({
  clock: $flexibleWithProxy,
  filter: nonNullable,
  fn: (flexibleWithProxy) => {
    return {
      walletId: flexibleWithProxy!.id,
      accounts: flexibleWithProxy!.accounts,
    };
  },
  target: updateAccountsFx,
});

sample({
  clock: updateAccountsFx.doneData,
  target: walletModel.events.updateAccounts,
});

export const multisigsModel = {
  events: {
    subscribe,
    request,
  },
};
