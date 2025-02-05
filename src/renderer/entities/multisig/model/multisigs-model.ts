import { type ApiPromise } from '@polkadot/api';
import { attach, combine, createEffect, createEvent, createStore, sample } from 'effector';
import { GraphQLClient } from 'graphql-request';
import { uniq } from 'lodash';
import { combineEvents, interval } from 'patronum';

import {
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
  ProxyVariant,
  SigningType,
  WalletType,
} from '@/shared/core';
import { waitFor } from '@/shared/effector';
import { takeLast } from '@/shared/effector/takeLast';
import { nonNullable, nullable, toAddress } from '@/shared/lib/utils';
import { type AnyAccount, accounts, accountsService } from '@/domains/network';
import { networkModel, networkUtils } from '@/entities/network';
import { notificationModel } from '@/entities/notification';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { proxiesModel } from '@/features/proxies';
import { type MultisigResult, multisigService } from '../api';
import { multisigUtils } from '../lib/mulitisigs-utils';

const MULTISIG_DISCOVERY_TIMEOUT = 30000;

const subscribe = createEvent();
const stop = createEvent();
const request = createEvent<AnyAccount[]>();

const createWallets = attach({ effect: walletModel.createWallets });

const $multisigAccounts = accounts.$list.map((accounts) => accounts.filter(accountUtils.isMultisigAccount));

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
};

type MultisigResponse = {
  type: 'multisig';
  account: NoID<Omit<MultisigAccount, 'walletId'>>;
  chain: Chain;
};

type FlexibleMultisigResponse = {
  type: 'flexibleMultisig';
  activated: boolean;
  account: NoID<Omit<FlexibleMultisigAccount, 'walletId'>>;
  chain: Chain;
};

type GetMultisigResponse = MultisigResponse | FlexibleMultisigResponse;

const getMultisigsFx = createEffect(({ chains, accounts }: GetMultisigsParams): Promise<MultisigResult[]> => {
  const requests = chains.flatMap(async (chain) => {
    const multisigIndexer = networkUtils.getProxyExternalApi(chain);

    if (nullable(multisigIndexer) || accounts.length === 0) return [];

    const client = new GraphQLClient(multisigIndexer.url);
    const accountIds = uniq(
      accounts.filter((a) => accountUtils.isChainIdMatch(a, chain.chainId)).map((account) => account.accountId),
    );

    if (accountIds.length === 0) return [];

    const indexedMultisigs = await multisigService.filterMultisigsAccounts(client, accountIds, chain);

    return indexedMultisigs;
  });

  return Promise.all(requests).then((res) => res.flat());
});

const getLastMultisigsFx = takeLast({
  fn: getMultisigsFx,
  key: (params) => JSON.stringify(params),
});

sample({
  clock: [updateRequested, request],
  source: {
    chains: $multisigChains,
    connections: networkModel.$connections,
  },
  fn: ({ chains, connections }, accounts) => {
    const filteredChains = chains.filter((chain) => {
      if (nullable(connections[chain.chainId])) return false;

      return !networkUtils.isDisabledConnection(connections[chain.chainId]);
    });

    return {
      chains: filteredChains,
      accounts,
    };
  },
  target: getLastMultisigsFx,
});

type FilteredMultisigParams = {
  multisigAccounts: AnyAccount[];
  indexedMultisigs: MultisigResult[];
  apis: Record<ChainId, ApiPromise>;
};

const filterMultisigFx = createEffect(
  async ({ multisigAccounts, apis, indexedMultisigs }: FilteredMultisigParams): Promise<GetMultisigResponse[]> => {
    // filter out multisigs that already exists
    const filteredMultisigs = indexedMultisigs.filter((multisigResult) =>
      nullable(
        multisigAccounts.find(
          (a) =>
            a.accountId === multisigResult.accountId &&
            (accountsService.isUniversalAccount(a) || a.chainId === multisigResult.chain.chainId),
        ),
      ),
    );

    const { regularMultisigs, flexibleMultisigs } = await multisigService.findFlexibleMultisigs(
      apis,
      filteredMultisigs,
    );

    const buildFlex = flexibleMultisigs.map(
      ({ threshold, proxied, accountId, signatories, chain }): FlexibleMultisigResponse => {
        return {
          type: 'flexibleMultisig',
          activated: Boolean(proxied),
          account: multisigUtils.buildFlexibleMultisigAccount({
            threshold,
            proxyAccount: proxied
              ? ({
                  ...proxied,
                  accountType: AccountType.PROXIED,
                  proxyVariant: ProxyVariant.PURE,
                } as ProxiedAccount)
              : undefined,
            accountId,
            signatories,
            chain,
          }),
          chain,
        };
      },
    );

    const buildRegular = regularMultisigs.map(({ threshold, accountId, signatories, chain }): GetMultisigResponse => {
      return {
        type: 'multisig',
        account: multisigUtils.buildMultisigAccount({ threshold, accountId, signatories, chain }),
        chain,
      };
    });

    return [...buildRegular, ...buildFlex];
  },
);

sample({
  clock: getLastMultisigsFx.doneData,
  source: {
    multisigAccounts: $multisigAccounts,
    apis: networkModel.$apis,
  },
  filter: ({ apis }, multisigs) => multisigs.length > 0 && multisigs.some((m) => apis[m.chain.chainId]),
  fn: ({ multisigAccounts, apis }, indexedMultisigs) => ({ multisigAccounts, apis, indexedMultisigs }),
  target: filterMultisigFx,
});

const populateWallets = createEvent<GetMultisigResponse[]>();

sample({
  clock: filterMultisigFx.doneData,
  filter: (response) => response.length > 0,
  target: populateWallets,
});

sample({
  clock: filterMultisigFx.done,
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
    return responses.map(({ chain, account, activated }) => {
      const walletName = toAddress(account.accountId, { chunk: 5, prefix: chain.addressPrefix });
      const wallet: NoID<Omit<FlexibleMultisigWallet, 'accounts' | 'isActive'>> = {
        name: walletName,
        type: WalletType.FLEXIBLE_MULTISIG,
        signingType: SigningType.MULTISIG,
        activated: activated ?? false,
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

const readyforProxies = waitFor({
  source: createWallets.doneData,
  clock: proxiesModel.findAllProxies.pending,
  filter: (val): val is boolean => !val,
  reset: createWallets.done,
});

sample({
  clock: readyforProxies,
  target: proxiesModel.findAllProxies,
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

    return {
      ...proxiedWallet,
      accounts: proxiedWallet.accounts.map((acc) => ({ ...acc, proxyAccount: account })),
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

// Convert flexible multisig back to the regular
const convertFlexibleToRegular = createEvent<FlexibleMultisigAccount | null>();

sample({
  clock: convertFlexibleToRegular,
  source: walletModel.$activeWallet,
  filter: (wallet, account) => nonNullable(wallet) && nonNullable(account),
  fn: (wallet, account) => {
    return { ...wallet!, activated: undefined, type: WalletType.MULTISIG, accounts: [account!] };
  },
  target: walletModel.events.updateWalletWithDB,
});

sample({
  clock: convertFlexibleToRegular,
  filter: nonNullable,
  fn: (account) => ({
    ...account!,
    accountType: AccountType.MULTISIG,
    proxyAccount: undefined,
  }),
  target: accounts.updateAccount,
});

export const multisigsModel = {
  subscribe,
  request,
  convertFlexibleToRegular,
};
