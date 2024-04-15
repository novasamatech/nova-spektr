import { attach, createEffect, createEvent, createStore, sample, scopeBind } from 'effector';
import { Endpoint, createEndpoint } from '@remote-ui/rpc';
import keyBy from 'lodash/keyBy';
import { once, spread } from 'patronum';
import { GraphQLClient } from 'graphql-request';

import type {
  Account,
  AccountId,
  Chain,
  ChainId,
  Connection,
  PartialProxiedAccount,
  ProxiedAccount,
  ProxyAccount,
  ProxyDeposits,
  Wallet,
  WalletsMap,
} from '@shared/core';
import {
  AccountType,
  ChainType,
  CryptoType,
  SigningType,
  WalletType,
  NotificationType,
  NoID,
  ProxyGroup,
  ProxyVariant,
  ExternalType,
} from '@shared/core';
import { networkModel, networkUtils } from '@entities/network';
import { accountUtils, walletModel } from '@entities/wallet';
import { proxyModel, proxyUtils, pureProxiesService } from '@entities/proxy';
import { balanceModel } from '@entities/balance';
import { notificationModel } from '@entities/notification';
import { proxiesUtils } from '../lib/proxies-utils';
import { storageService } from '@shared/api/storage';
import { dictionary } from '@shared/lib/utils';

const workerStarted = createEvent();
const connected = createEvent<ChainId>();
const proxiedWalletsCreated = createEvent<ProxiedWalletsParams>();
const proxiedAccountsRemoved = createEvent<ProxiedAccount[]>();
const depositsReceived = createEvent<ProxyDeposits>();

type WalletsAddedProps = {
  wallets: Wallet[];
  accounts: Account[];
};
const walletsAdded = createEvent<WalletsAddedProps>();

const $endpoint = createStore<Endpoint<any> | null>(null);
const $deposits = createStore<ProxyDeposits[]>([]);

const startWorkerFx = createEffect(() => {
  // @ts-ignore
  const worker = new Worker(new URL('@features/proxies/workers/proxy-worker', import.meta.url));

  return createEndpoint(worker, {
    callable: ['initConnection', 'getProxies', 'disconnect'],
  });
});

type StartChainsProps = {
  chains: Chain[];
  connections: Record<ChainId, Connection>;
  endpoint: Endpoint<any>;
};
const startChainsFx = createEffect(({ chains, connections, endpoint }: StartChainsProps) => {
  const boundConnected = scopeBind(connected, { safe: true });

  chains.forEach((chain) => {
    if (networkUtils.isDisabledConnection(connections[chain.chainId])) return;

    endpoint.call.initConnection(chain, connections[chain.chainId]).then(() => {
      boundConnected(chain.chainId);
    });
  });
});

type GetProxiesParams = {
  chainId: ChainId;
  chain: Chain;
  accounts: Account[];
  wallets: WalletsMap;
  proxies: ProxyAccount[];
  endpoint: Endpoint<any>;
};
type GetProxiesResult = {
  proxiesToAdd: NoID<ProxyAccount>[];
  proxiesToRemove: ProxyAccount[];
  proxiedAccountsToAdd: PartialProxiedAccount[];
  proxiedAccountsToRemove: ProxiedAccount[];
  deposits: {
    chainId: ChainId;
    deposits: Record<AccountId, string>;
  };
};
const getProxiesFx = createEffect(
  async ({ chainId, chain, accounts, wallets, proxies, endpoint }: GetProxiesParams): Promise<GetProxiesResult> => {
    const proxiedAccounts = accounts.filter((a) => accountUtils.isProxiedAccount(a) && a.chainId === chainId);
    const chainProxies = proxies.filter((p) => p.chainId === chainId);

    const walletsMap = keyBy(wallets, 'id');

    const accountsForProxy = keyBy(accounts, 'accountId');
    const accountsForProxied = keyBy(
      accounts.filter((a) => proxiesUtils.isProxiedAvailable(walletsMap[a.walletId])),
      'accountId',
    );

    const proxiesResult = (await endpoint.call.getProxies({
      chainId,
      accountsForProxy,
      accountsForProxied,
      proxiedAccounts,
      proxies: chainProxies,
    })) as GetProxiesResult;

    const { proxiedAccountsToAdd } = proxiesResult;

    const proxyUrl =
      networkUtils.isPureProxySupported(chain.options) && chain.externalApi?.[ExternalType.PROXY]?.[0]?.url;

    if (proxyUrl && proxiedAccountsToAdd.length) {
      const client = new GraphQLClient(proxyUrl);

      const pureProxies = await pureProxiesService.filterPureProxiedAccountIds(
        client,
        proxiedAccountsToAdd.map((p) => p.accountId),
      );

      const pureProxiesMap = dictionary(pureProxies, 'accountId');

      for (let i in proxiedAccountsToAdd) {
        const pureProxy = pureProxiesMap[proxiedAccountsToAdd[i].accountId];
        if (pureProxy) {
          proxiedAccountsToAdd[i].proxyVariant = ProxyVariant.PURE;
          proxiedAccountsToAdd[i].blockNumber = pureProxy.blockNumber;
          proxiedAccountsToAdd[i].extrinsicIndex = pureProxy.extrinsicIndex;
        } else {
          proxiedAccountsToAdd[i].proxyVariant = ProxyVariant.REGULAR;
        }
      }
    }

    return proxiesResult;
  },
);

const disconnectFx = createEffect(async ({ chainId, endpoint }: { chainId: ChainId; endpoint: Endpoint<any> }) => {
  await endpoint.call.disconnect(chainId);
});

type ProxiedWalletsParams = {
  proxiedAccounts: PartialProxiedAccount[];
  chains: Record<ChainId, Chain>;
};
type ProxiedWalletsResult = {
  wallets: Wallet[];
  accounts: ProxiedAccount[];
};
const createProxiedWalletsFx = createEffect(
  async ({ proxiedAccounts, chains }: ProxiedWalletsParams): Promise<ProxiedWalletsResult> => {
    const proxiedWallets = proxiedAccounts.map((proxied) => {
      const walletName = proxyUtils.getProxiedName(proxied, chains[proxied.chainId].addressPrefix);
      const wallet = {
        name: walletName,
        type: WalletType.PROXIED,
        signingType: SigningType.WATCH_ONLY,
      } as Wallet;

      const isEthereumChain = networkUtils.isEthereumBased(chains[proxied.chainId].options);

      const accounts = [
        {
          ...proxied,
          name: walletName,
          type: AccountType.PROXIED,
          chainType: isEthereumChain ? ChainType.ETHEREUM : ChainType.SUBSTRATE,
          cryptoType: isEthereumChain ? CryptoType.ETHEREUM : CryptoType.SR25519,
        } as ProxiedAccount,
      ];

      return { wallet, accounts };
    });

    const dbWalletsAndAccounts = await Promise.all(
      proxiedWallets.map(async ({ wallet, accounts }) => {
        const dbWallet = await storageService.wallets.create({ ...wallet, isActive: false });

        if (!dbWallet) return undefined;

        const accountsPayload = accounts.map((account) => ({ ...account, walletId: dbWallet.id }));
        const dbAccounts = await storageService.accounts.createAll(accountsPayload);

        if (!dbAccounts) return undefined;

        return { wallet: dbWallet, accounts: dbAccounts as ProxiedAccount[] };
      }),
    );

    return dbWalletsAndAccounts.reduce(
      (acc, proxiedCreatedResult) => {
        if (!proxiedCreatedResult) return acc;

        acc.accounts.push(...proxiedCreatedResult.accounts);
        acc.wallets.push(proxiedCreatedResult.wallet);

        return acc;
      },
      {
        wallets: [] as Wallet[],
        accounts: [] as ProxiedAccount[],
      },
    );
  },
);

sample({
  clock: workerStarted,
  target: startWorkerFx,
});

sample({
  clock: startWorkerFx.doneData,
  target: $endpoint,
});

sample({
  clock: [startWorkerFx.done, once(networkModel.$connections)],
  source: {
    connections: networkModel.$connections,
    chains: networkModel.$chains,
    endpoint: $endpoint,
  },
  filter: ({ endpoint }) => Boolean(endpoint),
  fn: ({ connections, chains, endpoint }) => ({
    chains: Object.values(chains).filter(
      (chain) => proxiesUtils.isRegularProxy(chain) || proxiesUtils.isPureProxy(chain),
    ),
    connections,
    endpoint: endpoint!,
  }),
  target: startChainsFx,
});

sample({
  clock: connected,
  source: {
    accounts: walletModel.$accounts,
    chains: networkModel.$chains,
    proxies: proxyModel.$proxies,
    wallets: walletModel.$wallets,
    endpoint: $endpoint,
  },
  filter: ({ endpoint }) => Boolean(endpoint),
  fn: ({ accounts, chains, wallets, proxies, endpoint }, chainId) => ({
    chainId,
    chain: chains[chainId],
    accounts: accounts.filter((a) => accountUtils.isChainIdMatch(a, chainId)),
    wallets,
    proxies: Object.values(proxies).flat(),
    endpoint: endpoint!,
  }),
  target: getProxiesFx,
});

spread({
  source: getProxiesFx.doneData,
  targets: {
    proxiesToRemove: proxyModel.events.proxiesRemoved,
    proxiesToAdd: proxyModel.events.proxiesAdded,
    proxiedAccountsToRemove: proxiedAccountsRemoved,
    proxiedAccountsToAdd: attach({
      source: networkModel.$chains,
      mapParams: (proxiedAccounts: ProxiedAccount[], chains) => ({ proxiedAccounts, chains }),
      effect: createProxiedWalletsFx,
    }),
    deposits: depositsReceived,
  },
});

sample({
  clock: depositsReceived,
  source: $deposits,
  filter: (_, newDeposits) => newDeposits && Object.keys(newDeposits.deposits).length > 0,
  fn: (deposits, newDeposits) => deposits.filter((d) => d.chainId === newDeposits.chainId).concat(newDeposits),
  target: $deposits,
});

sample({
  clock: proxiedAccountsRemoved,
  fn: (proxiedAccounts) => proxiedAccounts.map((p) => p.walletId),
  target: walletModel.events.walletsRemoved,
});

sample({
  clock: proxiedAccountsRemoved,
  fn: (proxiedAccounts) => proxiedAccounts.map((p) => p.id),
  target: balanceModel.events.balancesRemoved,
});

sample({
  clock: getProxiesFx.done,
  source: $endpoint,
  filter: (endpoint) => Boolean(endpoint),
  fn: (endpoint, { params: { chainId } }) => ({ chainId, endpoint: endpoint! }),
  target: disconnectFx,
});

sample({
  clock: createProxiedWalletsFx.doneData,
  source: {
    wallets: walletModel.$wallets,
    accounts: walletModel.$accounts,
  },
  filter: (_, data) => Boolean(data && data.wallets.length && data.accounts.length),
  fn: ({ wallets, accounts }, data) => ({
    wallets: wallets.concat(data.wallets),
    accounts: accounts.concat(data.accounts),
  }),
  target: walletsAdded,
});

sample({
  source: walletsAdded,
  target: spread({
    wallets: walletModel.$wallets,
    accounts: walletModel.$accounts,
  }),
});

sample({
  clock: depositsReceived,
  source: {
    wallets: walletModel.$wallets,
    accounts: walletModel.$accounts,
    groups: proxyModel.$proxyGroups,
  },
  filter: (_, deposits) => Boolean(deposits),
  fn: ({ wallets, accounts, groups }, deposits) => proxyUtils.createProxyGroups(wallets, accounts, groups, deposits!),
  target: spread({
    toAdd: proxyModel.events.proxyGroupsAdded,
    toUpdate: proxyModel.events.proxyGroupsUpdated,
    toRemove: proxyModel.events.proxyGroupsRemoved,
  }),
});

sample({
  clock: walletsAdded,
  source: {
    groups: proxyModel.$proxyGroups,
    deposits: $deposits,
  },
  filter: ({ deposits }) => Boolean(deposits),
  fn: ({ groups, deposits }, { wallets, accounts }) => {
    return deposits.reduce(
      (acc, deposit) => {
        const { toAdd, toUpdate, toRemove } = proxyUtils.createProxyGroups(wallets, accounts, groups, deposit);

        return {
          toAdd: acc.toAdd.concat(toAdd),
          toUpdate: acc.toUpdate.concat(toUpdate),
          toRemove: acc.toRemove.concat(toRemove),
        };
      },
      {
        toAdd: [] as NoID<ProxyGroup>[],
        toUpdate: [] as NoID<ProxyGroup>[],
        toRemove: [] as ProxyGroup[],
      },
    );
  },
  target: spread({
    toAdd: proxyModel.events.proxyGroupsAdded,
    toUpdate: proxyModel.events.proxyGroupsUpdated,
  }),
});

sample({
  clock: getProxiesFx.doneData,
  source: {
    wallets: walletModel.$wallets,
    accounts: walletModel.$accounts,
    chains: networkModel.$chains,
  },
  filter: (_, data) => data.proxiedAccountsToAdd.length > 0,
  fn: ({ wallets, accounts, chains }, data) =>
    proxiesUtils.getNotification({
      wallets,
      accounts,
      chains,
      proxiedAccounts: data.proxiedAccountsToAdd,
      type: NotificationType.PROXY_CREATED,
    }),
  target: notificationModel.events.notificationsAdded,
});

sample({
  clock: getProxiesFx.doneData,
  source: {
    wallets: walletModel.$wallets,
    accounts: walletModel.$accounts,
    chains: networkModel.$chains,
  },
  filter: (_, data) => data.proxiedAccountsToRemove.length > 0,
  fn: ({ wallets, accounts, chains }, data) =>
    proxiesUtils.getNotification({
      wallets,
      accounts,
      chains,
      proxiedAccounts: data.proxiedAccountsToRemove,
      type: NotificationType.PROXY_REMOVED,
    }),
  target: notificationModel.events.notificationsAdded,
});

sample({
  clock: proxiedWalletsCreated,
  target: createProxiedWalletsFx,
});

export const proxiesModel = {
  events: {
    workerStarted,
    proxiedWalletsCreated,
  },

  output: {
    walletsCreated: createProxiedWalletsFx.doneData,
  },
};
