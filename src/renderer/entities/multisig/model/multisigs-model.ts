import { type ApiPromise } from '@polkadot/api';
import { attach, combine, createEffect, createEvent, createStore, sample } from 'effector';
import { GraphQLClient } from 'graphql-request';
import { uniq } from 'lodash';
import { combineEvents, interval } from 'patronum';

import {
  type Chain,
  type ChainId,
  ExternalType,
  type FlexibleMultisigCreated,
  type FlexibleMultisigWallet,
  type MultisigAccount,
  type MultisigCreated,
  type MultisigWallet,
  type NoID,
  NotificationType,
  type ProxiedAccount,
  SigningType,
  type Wallet,
  WalletType,
} from '@/shared/core';
import { series, waitFor } from '@/shared/effector';
import { takeLast } from '@/shared/effector/takeLast';
import { nonNullable, nullable, toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { identity, identityService } from '@/domains/network';
import { type AnyAccount, accountService, accounts } from '@/domains/network';
import { networkModel, networkUtils } from '@/entities/network';
import { notificationModel } from '@/entities/notification';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { proxiesModel } from '@/features/proxies';
import { type MultisigResult, multisigService } from '../api';
import { multisigUtils } from '../lib/mulitisigs-utils';

const MULTISIG_DISCOVERY_TIMEOUT = 30000;

// Bond flexible multisig with proxy
const $flexibleWithProxy = createStore<FlexibleMultisigWallet | null>(null);

const subscribe = createEvent();
const stop = createEvent();
const request = createEvent<AnyAccount[]>();

const populateWallets = createEvent<GetMultisigResponse[]>();

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
  fn: (accounts) => {
    return accounts.filter((a) => {
      const isWatchOnly = accountUtils.isWatchOnlyAccount(a);
      const isProxied = accountUtils.isProxiedAccount(a);
      const isMultisig = accountUtils.isMultisigAccount(a);

      return !isWatchOnly && !isProxied && !isMultisig;
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

const getMultisigsFx = createEffect(({ chains, accounts }: GetMultisigsParams): Promise<MultisigResult[]> => {
  const requests = chains.flatMap((chain) => {
    const multisigIndexer = networkUtils.getProxyExternalApi(chain);

    if (nullable(multisigIndexer) || accounts.length === 0) return [];

    const client = new GraphQLClient(multisigIndexer.url);
    const accountIds = uniq(
      accounts.filter((a) => accountUtils.isChainIdMatch(a, chain.chainId)).map((account) => account.accountId),
    );

    if (accountIds.length === 0) return [];

    return multisigService.filterMultisigsAccounts(client, accountIds, chain);
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

    return { chains: filteredChains, accounts };
  },
  target: getLastMultisigsFx,
});

type MultisigAccountNoId = NoID<Omit<MultisigAccount, 'walletId'>>;
type MultisigResponse = {
  type: 'multisig';
  accounts: MultisigAccountNoId[];
  chain: Chain;
};

type FlexibleMultisigResponse = {
  type: 'flexibleMultisig';
  activated: boolean;
  accounts: (ProxiedAccount | MultisigAccountNoId)[];
  chain: Chain;
};

type GetMultisigResponse = MultisigResponse | FlexibleMultisigResponse;

type FilteredMultisigParams = {
  apis: Record<ChainId, ApiPromise>;
  accounts: MultisigResult[];
};
const enrichIndexedMultisigsFx = createEffect(
  async ({ accounts }: FilteredMultisigParams): Promise<GetMultisigResponse[]> => {
    if (accounts.length === 0) return [];

    // TODO: uncomment when flexible multisigs will be supported
    // const { regularMultisigs, flexibleMultisigs } = await multisigService.findFlexibleMultisigs(
    //   apis,
    //   accounts,
    // );

    // const buildFlex = flexibleMultisigs.map(
    //   ({ threshold, proxied, accountId, signatories, chain }): FlexibleMultisigResponse => {
    //     const multisigAccount = multisigUtils.buildMultisigAccount({ threshold, accountId, signatories, chain });
    //     const flexibleAccounts = proxied
    //       ? [
    //           {
    //             ...proxied,
    //             accountType: AccountType.PROXIED,
    //             proxyVariant: ProxyVariant.PURE,
    //             type: 'chain',
    //             chainId: chain.chainId,
    //             signingType: SigningType.WATCH_ONLY,
    //           } as ProxiedAccount,
    //           multisigAccount,
    //         ]
    //       : [multisigAccount];

    //     return {
    //       type: 'flexibleMultisig',
    //       activated: Boolean(proxied),
    //       accounts: flexibleAccounts,
    //       chain,
    //     };
    //   },
    // );

    // const buildRegular = regularMultisigs.map(({ threshold, accountId, signatories, chain }): GetMultisigResponse => {
    //   return {
    //     type: 'multisig',
    //     accounts:[ multisigUtils.buildMultisigAccount({ threshold, accountId, signatories, chain })]
    //     chain,
    //   };
    // });

    // return [...buildRegular, ...buildFlex];

    return accounts.map(
      ({ threshold, accountId, signatories, chain }): GetMultisigResponse => ({
        type: 'multisig',
        accounts: [multisigUtils.buildMultisigAccount({ threshold, accountId, signatories, chain })],
        chain,
      }),
    );
  },
);

sample({
  clock: getLastMultisigsFx.doneData,
  source: {
    multisigAccounts: $multisigAccounts,
    apis: networkModel.$apis,
  },
  filter: ({ apis }, multisigs) => multisigs.length > 0 && multisigs.some((m) => apis[m.chain.chainId]),
  fn: ({ multisigAccounts, apis }, indexedMultisigs) => {
    const accounts = indexedMultisigs.filter((multisigResult) => {
      return multisigAccounts.every((a) => {
        const isSameAccountId = a.accountId === multisigResult.accountId;
        const isUniversal = accountService.isUniversalAccount(a) || a.chainId === multisigResult.chain.chainId;

        return !isSameAccountId && !isUniversal;
      });
    });

    return { apis, accounts };
  },
  target: enrichIndexedMultisigsFx,
});

const requestIdentitiesFx = series(identity.request, { parallel: true, skipErrors: true });

sample({
  clock: enrichIndexedMultisigsFx.doneData,
  filter: (multisigs) => multisigs.length > 0,
  fn: (multisigs) => {
    const grouped: Record<ChainId, AccountId[]> = {};

    for (const { chain, accounts } of multisigs) {
      const account = accounts.find(accountUtils.isProxiedAccount) || accounts.at(0);
      if (!account) continue;

      if (nullable(grouped[chain.chainId])) {
        grouped[chain.chainId] = [account.accountId];
      } else {
        grouped[chain.chainId].push(account.accountId);
      }
    }

    return Object.entries(grouped).map((entry) => {
      const [chainId, accounts] = entry as [ChainId, AccountId[]];

      return { chainId, accounts };
    });
  },
  target: requestIdentitiesFx,
});

sample({
  clock: enrichIndexedMultisigsFx.doneData,
  filter: (response) => response.length > 0,
  target: populateWallets,
});

sample({
  clock: enrichIndexedMultisigsFx.done,
  source: $isPollingRunning,
  filter: (isRunning) => isRunning,
  target: [stop, subscribe],
});

const populateMultisigWallets = populateWallets.map((drafts) => {
  return drafts.filter((x) => x.type === 'multisig');
});

const populateFlexibleMultisigWallets = populateWallets.map((drafts) => {
  return drafts.filter((x) => x.type === 'flexibleMultisig');
});

sample({
  clock: combineEvents({
    events: {
      multisigs: populateMultisigWallets,
      identity: requestIdentitiesFx.done,
    },
  }),
  filter: ({ multisigs }) => multisigs.every((m) => m.accounts.find(accountUtils.isMultisigAccount)),
  fn: ({ multisigs, identity }) => {
    return multisigs.map(({ chain, accounts }) => {
      const account = accounts.find(accountUtils.isMultisigAccount)!;

      const index = (identity.params as { chainId: ChainId }[]).findIndex(({ chainId }) => chainId === chain.chainId);
      const walletIdentity = identity.result.at(index)?.[account.accountId];

      const address = toAddress(account.accountId, { chunk: 5, prefix: chain.addressPrefix });

      const wallet: NoID<Omit<MultisigWallet, 'accounts' | 'isActive'>> = {
        name: walletIdentity ? identityService.getFullIdentityName(walletIdentity) : address,
        type: WalletType.MULTISIG,
        signingType: SigningType.MULTISIG,
      };

      return { wallet, accounts };
    });
  },
  target: createWallets,
});

sample({
  clock: combineEvents({
    events: {
      multisigs: populateFlexibleMultisigWallets,
      identity: requestIdentitiesFx.done,
    },
  }),
  filter: ({ multisigs }) => multisigs.every((m) => m.accounts.find(accountUtils.isProxiedAccount) || m.accounts.at(0)),
  fn: ({ multisigs, identity }) => {
    return multisigs.map(({ chain, accounts, activated }) => {
      const account = accounts.find(accountUtils.isProxiedAccount) || accounts.at(0);
      const index = (identity.params as { chainId: ChainId }[]).findIndex(({ chainId }) => chainId === chain.chainId);
      const walletIdentity = identity.result.at(index)?.[account!.accountId];

      const address = toAddress(account!.accountId, { chunk: 5, prefix: chain.addressPrefix });
      const wallet: NoID<Omit<FlexibleMultisigWallet, 'accounts' | 'isActive'>> = {
        name: walletIdentity ? identityService.getFullIdentityName(walletIdentity) : address,
        type: WalletType.FLEXIBLE_MULTISIG,
        signingType: SigningType.MULTISIG,
        activated: activated ?? false,
      };

      return {
        wallet,
        accounts,
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
        if (accountUtils.isMultisigAccount(account)) {
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

        if (walletUtils.isFlexibleMultisig(wallet as Wallet) && accountUtils.isMultisigAccount(account)) {
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

const readyForProxies = waitFor({
  clock: proxiesModel.findAllProxies.pending,
  source: createWallets.doneData,
  filter: (val): val is boolean => !val,
  reset: createWallets.done,
});

sample({
  clock: readyForProxies,
  target: proxiesModel.findAllProxies,
});

sample({
  clock: walletModel.events.walletCreatedDone,
  source: walletModel.$wallets,
  filter: (_, { accounts }) => {
    const account = accounts.find((a) => accountUtils.isProxiedAccount(a));

    return nonNullable(account) && account.proxyType === 'Any';
  },
  fn: (wallets, { accounts }) => {
    const account = accounts.at(0)! as ProxiedAccount;

    const proxyWallet = walletUtils.getWalletFilteredAccounts(wallets, {
      walletFn: walletUtils.isFlexibleMultisig,
      accountFn: (a) => a.accountId === account.proxyAccountId,
    }) as FlexibleMultisigWallet | null;

    if (!proxyWallet) return null;

    return {
      ...proxyWallet,
      accounts: [{ ...account, walletId: proxyWallet.id }, ...proxyWallet.accounts],
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

// Convert flexible shell multisig back to the regular
const convertFlexibleToRegular = createEvent<MultisigAccount | null>();

sample({
  clock: convertFlexibleToRegular,
  source: walletModel.$activeWallet,
  filter: (wallet, account) => nonNullable(wallet) && nonNullable(account),
  fn: (wallet, account) => {
    return { ...wallet!, activated: undefined, type: WalletType.MULTISIG, accounts: [account!] };
  },
  target: walletModel.events.updateWalletWithDB,
});

// Convert regular multisig to flexible
const convertRegularToFlexible = createEvent<MultisigWallet | null>();

sample({
  clock: convertRegularToFlexible,
  filter: nonNullable,
  fn: (wallet) => {
    return { ...wallet!, activated: false, type: WalletType.FLEXIBLE_MULTISIG };
  },
  target: walletModel.events.updateWalletWithDB,
});

export const multisigsModel = {
  subscribe,
  request,
  convertFlexibleToRegular,
  convertRegularToFlexible,

  __test: {
    requestIdentitiesFx,
  },
};
