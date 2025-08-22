import { attach, combine, createEffect, createEvent, sample, scopeBind } from 'effector';
import { GraphQLClient } from 'graphql-request';
import { uniq } from 'lodash';
import { combineEvents, interval } from 'patronum';

import {
  type Chain,
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
import { waitFor } from '@/shared/effector';
import { takeLast } from '@/shared/effector/takeLast';
import { delay, isFulfilled, nonNullable, nullable, toAddress, toShortAddress } from '@/shared/lib/utils';
import { identity, identityService } from '@/domains/network';
import { type AnyAccount, accounts } from '@/domains/network';
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

const createWalletsFx = attach({ effect: walletModel.createWallets });
const requestIdentitiesFx = attach({ effect: identity.request });

const $multisigAccounts = accounts.$list.map((accounts) => accounts.filter(accountUtils.isMultisigAccount));

const { tick: pollingRequest, isRunning: $isPollingRunning } = interval({
  start: subscribe,
  stop: stop,
  timeout: MULTISIG_DISCOVERY_TIMEOUT,
});

const populateWallets = createEvent<GetMultisigResponse[]>();

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

const getMultisigsFx = createEffect(({ chains, accounts }: GetMultisigsParams) => {
  if (accounts.length === 0) return [];

  const boundRequestIdentities = scopeBind(requestIdentitiesFx, { safe: true });
  const requests = chains.flatMap(async (chain) => {
    const multisigIndexer = networkUtils.getProxyExternalApi(chain);
    if (nullable(multisigIndexer)) return [];

    const client = new GraphQLClient(multisigIndexer.url);
    const chainAccounts = accounts.filter((a) => accountUtils.isChainIdMatch(a, chain.chainId));
    const accountIds = uniq(chainAccounts.map((account) => account.accountId));

    if (accountIds.length === 0) return [];

    const multisigs = await multisigService.filterMultisigsAccounts(client, accountIds, chain);
    try {
      // Identity request with drop after 15 seconds
      const identities = await Promise.race([
        boundRequestIdentities({
          accounts: multisigs.map((x) => x.accountId),
          chainId: chain.chainId,
        }),
        delay(15000),
      ]);

      return multisigs.map<MultisigResult>((multisig) => {
        const identity = identities?.[multisig.accountId];
        return {
          ...multisig,
          name: identity ? identityService.getFullName(identity) : undefined,
        };
      });
    } catch {
      // A lot of chains don't have identity pallet
      return multisigs;
    }
  });

  // Skip all failed requests - maybe next time they'll be fulfilled
  return Promise.allSettled(requests)
    .then((res) => res.filter(isFulfilled).map((r) => r.value))
    .then((res) => res.flat());
});

// Discovery might take some time, so we drop previous request and start a new one.
const getLastMultisigsFx = takeLast({
  fn: getMultisigsFx,
  key: (params) => JSON.stringify(params),
});

type MultisigAccountNoId = NoID<Omit<MultisigAccount, 'walletId'>>;
type MultisigResponse = {
  type: 'multisig';
  accounts: MultisigAccountNoId[];
  chain: Chain;
};

type FlexibleMultisigResponse = {
  type: 'flexibleMultisig';
  accounts: (ProxiedAccount | MultisigAccountNoId)[];
  chain: Chain;
};

type GetMultisigResponse = MultisigResponse | FlexibleMultisigResponse;

type FilteredMultisigParams = {
  accounts: MultisigResult[];
};
const enrichIndexedMultisigsFx = createEffect(
  async ({ accounts }: FilteredMultisigParams): Promise<GetMultisigResponse[]> => {
    if (accounts.length === 0) return [];

    // TODO: uncomment when flexible multisigs will be supported
    // const flexibleMultisigs = await multisigService.findFlexibleMultisigs(apis, accounts);

    // const buildFlex = flexibleMultisigs.map(
    //   ({ threshold, proxied, accountId, signatories, chain, name }): FlexibleMultisigResponse => {
    //     const multisigAccount = multisigUtils.buildMultisigAccount({
    //       threshold,
    //       accountId,
    //       signatories,
    //       name: name ?? toAddress(accountId, { chunk: 5, prefix: chain.addressPrefix }),
    //     });

    //     const flexibleAccounts = proxied
    //       ? [
    //           {
    //             ...proxied,
    //             accountType: AccountType.PROXIED,
    //             proxyVariant: ProxyVariant.PURE,
    //             type: 'chain',
    //             chainId: chain.chainId,
    //             signingType: SigningType.WATCH_ONLY,
    //             name: name ?? toAddress(proxied.accountId, { chunk: 5, prefix: chain.addressPrefix }),
    //           } as ProxiedAccount,
    //           multisigAccount,
    //         ]
    //       : [multisigAccount];

    //     return {
    //       type: 'flexibleMultisig',
    //       accounts: flexibleAccounts,
    //       chain,
    //     };
    //   },
    // );

    // const buildRegular = multisigService.getUniqMultisigs(accounts).map(
    //   ({ threshold, accountId, signatories, chain, name }): GetMultisigResponse => ({
    //     type: 'multisig',
    //     accounts: [
    //       multisigUtils.buildMultisigAccount({
    //         threshold,
    //         accountId,
    //         signatories,
    //         name: name ?? toAddress(accountId, { chunk: 5, prefix: chain.addressPrefix }),
    //       }),
    //     ],
    //     chain,
    //   }),
    // );

    // return [...buildRegular, ...buildFlex];

    return multisigService.getUniqMultisigs(accounts).map(
      ({ threshold, accountId, signatories, chain, name }): GetMultisigResponse => ({
        type: 'multisig',
        accounts: [
          multisigUtils.buildMultisigAccount({
            threshold,
            accountId,
            signatories,
            name: name ?? toShortAddress(toAddress(accountId, { prefix: chain.addressPrefix }), 5),
          }),
        ],
        chain,
      }),
    );
  },
);

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

sample({
  clock: getLastMultisigsFx.doneData,
  source: {
    multisigAccounts: $multisigAccounts,
    apis: networkModel.$apis,
  },
  filter: (_, multisigs) => multisigs.length > 0,
  fn: ({ multisigAccounts, apis }, indexedMultisigs) => {
    const existingAccountIds = new Set(multisigAccounts.map((a) => a.accountId));
    const accounts = indexedMultisigs.filter((indexed) => !existingAccountIds.has(indexed.accountId));

    return { accounts, apis };
  },
  target: enrichIndexedMultisigsFx,
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
  clock: populateMultisigWallets,
  filter: (multisigs) => multisigs.every((m) => m.accounts.find(accountUtils.isMultisigAccount)),
  fn: (multisigs) => {
    return multisigs.map(({ accounts }) => {
      const account = accounts.find(accountUtils.isMultisigAccount)!;
      const wallet: NoID<Omit<MultisigWallet, 'accounts' | 'isActive'>> = {
        name: account.name,
        type: WalletType.MULTISIG,
        signingType: SigningType.MULTISIG,
      };

      return { wallet, accounts };
    });
  },
  target: createWalletsFx,
});

sample({
  clock: populateFlexibleMultisigWallets,
  filter: (multisigs) => multisigs.every((m) => m.accounts.find(accountUtils.isProxiedAccount) || m.accounts.at(0)),
  fn: (multisigs) => {
    return multisigs.map(({ accounts }) => {
      const account = accounts.find(accountUtils.isProxiedAccount) || accounts.at(0);
      const wallet: NoID<Omit<FlexibleMultisigWallet, 'accounts' | 'isActive'>> = {
        name: account!.name,
        type: WalletType.FLEXIBLE_MULTISIG,
        signingType: SigningType.MULTISIG,
      };

      return {
        wallet,
        accounts,
      };
    });
  },
  target: createWalletsFx,
});

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

        if (walletUtils.isFlexibleMultisig(wallet as Wallet) && accountUtils.isMultisigAccount(account)) {
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

// Find proxies after all wallets are created
const readyForProxies = waitFor({
  clock: proxiesModel.findAllProxies.pending,
  source: createWalletsFx.doneData,
  filter: (val): val is boolean => !val,
  reset: createWalletsFx.done,
});

sample({
  clock: readyForProxies,
  target: proxiesModel.findAllProxies,
});

export const multisigsModel = {
  subscribe,
  request,

  __test: {
    requestIdentitiesFx,
  },
};
