import { type Endpoint, createEndpoint } from '@remote-ui/rpc';
import { attach, createEffect, createEvent, createStore, sample, scopeBind } from 'effector';
import { GraphQLClient } from 'graphql-request';
import keyBy from 'lodash/keyBy';
import { once, spread } from 'patronum';

import { storageService } from '@/shared/api/storage';
import {
  type Account,
  type AccountId,
  type Chain,
  type ChainId,
  type Connection,
  type NoID,
  type PartialProxiedAccount,
  type ProxiedAccount,
  type ProxyAccount,
  type ProxyDeposits,
  type ProxyGroup,
  type Wallet,
  type WalletsMap,
} from '@/shared/core';
import {
  AccountType,
  ChainType,
  CryptoType,
  ExternalType,
  NotificationType,
  ProxyVariant,
  SigningType,
  WalletType,
} from '@/shared/core';
import { dictionary } from '@/shared/lib/utils';
import { balanceModel } from '@/entities/balance';
import { networkModel, networkUtils } from '@/entities/network';
import { notificationModel } from '@/entities/notification';
import { proxyModel, proxyUtils, pureProxiesService } from '@/entities/proxy';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { proxiesUtils } from '../lib/proxies-utils';

const workerStarted = createEvent();
const connected = createEvent<ChainId>();
const proxiedWalletsCreated = createEvent<ProxiedWalletsParams>();
const proxiedAccountsRemoved = createEvent<ProxiedAccount[]>();
const depositsReceived = createEvent<ProxyDeposits>();

const walletsAdded = createEvent<Wallet[]>();

const $endpoint = createStore<Endpoint<any> | null>(null);
const $deposits = createStore<ProxyDeposits[]>([]);

const startWorkerFx = createEffect(() => {
  const worker = new Worker(new URL('@/features/proxies/workers/proxy-worker', import.meta.url));

  return createEndpoint(worker, {
    callable: ['initConnection', 'getProxies', 'disconnect'],
  });
});

type StartChainsParams = {
  chains: Chain[];
  connections: Record<ChainId, Connection>;
  endpoint: Endpoint<any>;
};
const startChainsFx = createEffect(({ chains, connections, endpoint }: StartChainsParams) => {
  const boundConnected = scopeBind(connected, { safe: true });

  for (const chain of chains) {
    if (networkUtils.isDisabledConnection(connections[chain.chainId])) continue;

    endpoint.call.initConnection(chain, connections[chain.chainId]).then(() => {
      boundConnected(chain.chainId);
    });
  }
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

      for (const proxiedAccount of proxiedAccountsToAdd) {
        const pureProxy = pureProxiesMap[proxiedAccount.accountId];
        if (pureProxy) {
          proxiedAccount.proxyVariant = ProxyVariant.PURE;
          proxiedAccount.blockNumber = pureProxy.blockNumber;
          proxiedAccount.extrinsicIndex = pureProxy.extrinsicIndex;
        } else {
          proxiedAccount.proxyVariant = ProxyVariant.REGULAR;
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
        acc.wallets.push(proxiedCreatedResult.wallet as Wallet);

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
    chains: networkModel.$chains,
    proxies: proxyModel.$proxies,
    wallets: walletModel.$wallets,
    endpoint: $endpoint,
  },
  filter: ({ endpoint }) => Boolean(endpoint),
  fn: ({ chains, wallets, proxies, endpoint }, chainId) => {
    const accounts = walletUtils.getAccountsBy(wallets, (a) => accountUtils.isChainIdMatch(a, chainId));

    return {
      chainId,
      chain: chains[chainId],
      accounts,
      wallets,
      proxies: Object.values(proxies).flat(),
      endpoint: endpoint!,
    };
  },
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
  source: walletModel.$wallets,
  filter: (_, data) => Boolean(data && data.wallets.length && data.accounts.length),
  fn: (wallets, data) => {
    const accountsMap = dictionary(data.accounts, 'walletId');

    const newWallets = data.wallets.map((wallet) => ({ ...wallet, accounts: [accountsMap[wallet.id]] }) as Wallet);

    return wallets.concat(newWallets);
  },
  target: walletsAdded,
});

sample({
  source: walletsAdded,
  target: walletModel.$wallets,
});

sample({
  clock: walletsAdded,
  source: {
    groups: proxyModel.$proxyGroups,
    deposits: $deposits,
  },
  filter: ({ deposits }) => Boolean(deposits),
  fn: ({ groups, deposits }, wallets) => {
    return deposits.reduce(
      (acc, deposit) => {
        const { toAdd, toUpdate } = proxyUtils.createProxyGroups(wallets, groups, deposit);

        return {
          toAdd: acc.toAdd.concat(toAdd),
          toUpdate: acc.toUpdate.concat(toUpdate),
        };
      },
      {
        toAdd: [] as NoID<ProxyGroup>[],
        toUpdate: [] as NoID<ProxyGroup>[],
      },
    );
  },
  target: spread({
    toAdd: proxyModel.events.proxyGroupsAdded,
    toUpdate: proxyModel.events.proxyGroupsUpdated,
  }),
});

sample({
  clock: depositsReceived,
  source: {
    wallets: walletModel.$wallets,
    groups: proxyModel.$proxyGroups,
  },
  filter: (_, deposits) => Boolean(deposits),
  fn: ({ wallets, groups }, deposits) => proxyUtils.createProxyGroups(wallets, groups, deposits!),
  target: spread({
    toAdd: proxyModel.events.proxyGroupsAdded,
    toUpdate: proxyModel.events.proxyGroupsUpdated,
    toRemove: proxyModel.events.proxyGroupsRemoved,
  }),
});

sample({
  clock: getProxiesFx.doneData,
  source: {
    wallets: walletModel.$wallets,
    chains: networkModel.$chains,
  },
  filter: (_, data) => data.proxiedAccountsToAdd.length > 0,
  fn: ({ wallets, chains }, data) =>
    proxiesUtils.getNotification({
      wallets,
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
    chains: networkModel.$chains,
  },
  filter: (_, data) => data.proxiedAccountsToRemove.length > 0,
  fn: ({ wallets, chains }, data) =>
    proxiesUtils.getNotification({
      wallets,
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
