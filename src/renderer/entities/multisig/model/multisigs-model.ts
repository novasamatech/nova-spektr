import { attach, combine, createEffect, createEvent, createStore, sample } from 'effector';
import { GraphQLClient } from 'graphql-request';
import { uniq } from 'lodash';
import { combineEvents, interval } from 'patronum';

import {
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
import { nonNullable, nullable, toAddress } from '@/shared/lib/utils';
import { type AnyAccount, accounts } from '@/domains/network';
import { networkModel, networkUtils } from '@/entities/network';
import { notificationModel } from '@/entities/notification';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { multisigService } from '../api';
import { multisigUtils } from '../lib/mulitisigs-utils';

const MULTISIG_DISCOVERY_TIMEOUT = 30000;

const subscribe = createEvent();
const stop = createEvent();
const request = createEvent<AnyAccount[]>();

const createWallets = attach({ effect: walletModel.createWallets });

const $multisigAccounts = walletModel.$allWallets
  .map(walletUtils.getAllAccounts)
  .map((accounts) => accounts.filter(accountUtils.isMultisigAccount));

const { tick: pollingRequest, isRunning: $isPollingRunning } = interval({
  start: subscribe,
  stop: stop,
  timeout: MULTISIG_DISCOVERY_TIMEOUT,
});

const readyToRequest = combineEvents({
  events: [walletModel.populate.done, accounts.populate.done, networkModel.events.connectionsPopulated],
});

const updateRequested = sample({
  clock: [pollingRequest, readyToRequest],
  source: walletModel.$availableAccounts,
  fn(accounts) {
    return accounts.filter((a) => {
      return (
        !accountUtils.isWatchOnlyAccount(a) && !accountUtils.isProxiedAccount(a) && !accountUtils.isMultisigAccount(a)
      );
    });
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
  accounts: AnyAccount[];
  multisigAccounts: AnyAccount[];
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

const populateWallets = createEvent<GetMultisigResponse[]>();

sample({
  clock: getMultisigsFx.doneData,
  target: populateWallets,
});

sample({
  clock: getMultisigsFx.done,
  source: $isPollingRunning,
  filter: (isRunning) => isRunning,
  target: [stop, subscribe],
});

const populateMultisigWallets = populateWallets.map((drafts) => drafts.filter((x) => x.type === 'multisig'));

const populateFlexibleMultisigWallets = populateWallets.map((drafts) =>
  drafts.filter((x) => x.type === 'flexibleMultisig'),
);

sample({
  clock: populateMultisigWallets,
  fn(responses) {
    return responses.map(({ chain, account }) => {
      const walletName = toAddress(account.accountId, { chunk: 5, prefix: chain.addressPrefix });
      const wallet: NoID<Omit<MultisigWallet, 'accounts' | 'isActive'>> = {
        name: walletName,
        type: WalletType.MULTISIG,
        signingType: SigningType.MULTISIG,
      };

      return {
        wallet,
        accounts: [account],
      };
    });
  },
  target: createWallets,
});

sample({
  clock: populateFlexibleMultisigWallets,
  fn(responses) {
    return responses.map(({ chain, account }) => {
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
      };
    });
  },
  target: createWallets,
});

sample({
  clock: createWallets.doneData,
  fn: (drafts) => {
    const notifications = drafts.flatMap(({ wallet, accounts }) => {
      return accounts.map((account) => {
        if (accountUtils.isRegularMultisigAccount(account)) {
          return {
            read: false,
            type: NotificationType.MULTISIG_CREATED,
            dateCreated: Date.now(),
            multisigAccountId: account.accountId,
            multisigAccountName: account.name,
            chainId: account.chainId,
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
            chainId: account.chainId,
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

// Bond flexible multisig with proxy
const $flexibleWithProxy = createStore<FlexibleMultisigWallet | null>(null);

sample({
  clock: walletModel.events.walletCreatedDone,
  source: walletModel.$wallets,
  filter: (_, { accounts }) => {
    const account = accounts.at(0);

    return nonNullable(account) && accountUtils.isProxiedAccount(account) && account.proxyType === 'Any';
  },
  fn: (wallets, { accounts }) => {
    const account = accounts.at(0)! as ProxiedAccount;

    const proxiedWallet = walletUtils.getWalletFilteredAccounts(wallets, {
      walletFn: walletUtils.isFlexibleMultisig,
      accountFn: (a) => a.accountId === account.proxyAccountId,
    }) as FlexibleMultisigWallet | null;

    if (!proxiedWallet) return null;

    // Proxy accountId or entire account?
    return {
      ...proxiedWallet,
      accounts: proxiedWallet.accounts.map((acc) => ({ ...acc, proxyAccountId: account.accountId })),
      activated: true,
    };
  },
  target: $flexibleWithProxy,
});

sample({
  clock: $flexibleWithProxy,
  filter: nonNullable,
  fn: (flexibleWithProxy) => flexibleWithProxy!.accounts,
  target: accounts.updateAccounts,
});

sample({
  clock: $flexibleWithProxy,
  filter: nonNullable,
  target: walletModel.events.updateWalletWithDB,
});

export const multisigsModel = {
  subscribe,
  request,
};
