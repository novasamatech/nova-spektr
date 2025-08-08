import { type Endpoint, createEndpoint } from '@remote-ui/rpc';
import { attach, createEffect, createEvent, createStore, sample, scopeBind } from 'effector';
import { GraphQLClient } from 'graphql-request';
import { spread } from 'patronum';

import {
  AccountType,
  type Chain,
  type ChainId,
  type Connection,
  CryptoType,
  ExternalType,
  type NoID,
  NotificationType,
  type PartialProxiedAccount,
  type ProxiedAccount,
  type ProxiedWallet,
  type ProxyAccount,
  ProxyVariant,
  SigningType,
  type Wallet,
  WalletType,
} from '@/shared/core';
import { series } from '@/shared/effector';
import { dictionary, withTimeout } from '@/shared/lib/utils';
import {
  type AnyAccount,
  type IdentityMap,
  accountService,
  accounts,
  identity,
  identityService,
} from '@/domains/network';
import { balanceModel } from '@/entities/balance';
import { networkModel, networkUtils } from '@/entities/network';
import { notificationModel } from '@/entities/notification';
import { proxyModel, proxyUtils, pureProxiesService } from '@/entities/proxy';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { proxiesUtils } from '../lib/proxies-utils';

import { type proxyWorker } from './proxy-worker';

type WorkerType = Endpoint<typeof proxyWorker>;
const LOADING_TIMEOUT = 15_000;

const proxiedAccountsRemoved = createEvent<ProxiedAccount[]>();
const proxiedAccountsUpdated = createEvent<ProxiedAccount[]>();

const $worker = createStore<WorkerType | null>(null);

// Worker management

const getWorkerFx = attach({
  source: $worker,
  effect(worker) {
    if (worker) {
      return worker;
    }

    const nativeWorker = new Worker(new URL('./proxy-worker', import.meta.url), { type: 'module' });

    return createEndpoint<typeof proxyWorker>(nativeWorker, {
      callable: ['getProxies'],
    });
  },
});

sample({
  clock: getWorkerFx.doneData,
  target: $worker,
});

// Fetching proxies

type GetProxiesParams = {
  chain: Chain;
  connection: Connection;
  accounts: AnyAccount[];
  wallets: Wallet[];
  proxies: ProxyAccount[];
  worker: WorkerType;
};

type GetProxiesResult = {
  proxiesToAdd: NoID<ProxyAccount>[];
  proxiesToRemove: ProxyAccount[];
  proxiedAccountsToAdd: PartialProxiedAccount[];
  proxiedAccountsToRemove: ProxiedAccount[];
  proxiedAccountsToUpdate: PartialProxiedAccount[];
};

const requestIdentitiesFx = attach({
  effect: identity.request,
});

const fetchProxiesFx = createEffect(
  async ({ chain, connection, accounts, wallets, proxies, worker }: GetProxiesParams): Promise<GetProxiesResult> => {
    const proxiedAccounts = accounts.filter(accountUtils.isProxiedAccount).filter((a) => a.chainId === chain.chainId);
    const chainProxies = proxies.filter((p) => p.chainId === chain.chainId);

    const walletsMap = dictionary(wallets, 'id');
    const filteredAccounts = accounts.filter((a) => !walletsMap[a.walletId].isHidden);

    const accountsForProxy = dictionary(filteredAccounts, 'accountId');
    const accountsForProxied = dictionary(filteredAccounts.filter(proxiesUtils.isProxiedAvailable), 'accountId');

    const proxiesResult = await worker.call.getProxies({
      chain,
      connection,
      accountsForProxy,
      accountsForProxied,
      proxiedAccounts,
      proxies: chainProxies,
    });

    const { proxiedAccountsToAdd, proxiedAccountsToUpdate } = proxiesResult;
    const allProxiedAccountsToProcess = [...proxiedAccountsToAdd, ...proxiedAccountsToUpdate];

    const proxyUrl =
      networkUtils.isPureProxySupported(chain.options) && chain.externalApi?.[ExternalType.PROXY]?.[0]?.url;

    if (allProxiedAccountsToProcess.length) {
      const boundRequestIdentities = scopeBind(requestIdentitiesFx, { safe: true });
      try {
        await withTimeout(
          boundRequestIdentities({
            accounts: allProxiedAccountsToProcess.map((a) => a.accountId),
            chainId: chain.chainId,
          }),
          LOADING_TIMEOUT,
          null,
        );
      } catch (e) {
        console.error(e);
      }
    }

    if (proxyUrl && allProxiedAccountsToProcess.length) {
      const client = new GraphQLClient(proxyUrl);

      const pureProxies = await pureProxiesService.filterPureProxiedAccountIds(
        client,
        allProxiedAccountsToProcess.map((p) => p.accountId),
      );

      const pureProxiesMap = dictionary(pureProxies, 'accountId');

      for (const proxiedAccount of allProxiedAccountsToProcess) {
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

const findProxiesFx = attach({
  source: {
    wallets: walletModel.$allWallets,
    connections: networkModel.$connections,
    proxies: proxyModel.$proxies,
  },
  async effect({ wallets, proxies, connections }, { chain, accounts }: { chain: Chain; accounts: AnyAccount[] }) {
    const worker = await getWorkerFx();
    const connection = connections[chain.chainId];

    return fetchProxiesFx({
      accounts,
      wallets,
      chain,
      connection,
      worker,
      proxies: Object.values(proxies).flat(),
    });
  },
});

const findAllProxiesFx = attach({
  source: {
    accounts: accounts.$list,
    chains: networkModel.$chains,
  },
  mapParams(_: void, { chains, accounts }) {
    return Object.values(chains)
      .filter(proxiesUtils.chainSupportProxy)
      .map((chain) => ({
        chain,
        accounts: accountService.filterAccountsOnChain(accounts, chain),
      }));
  },
  effect: series(findProxiesFx, { parallel: true, skipErrors: true }),
});

// Wallet management

type ProxiedWalletsParams = {
  identity: IdentityMap;
  proxiedAccount: PartialProxiedAccount;
  chains: Record<ChainId, Chain>;
  wallets: Wallet[];
};

const createProxiedWalletFx = createEffect(({ identity, proxiedAccount, chains, wallets }: ProxiedWalletsParams) => {
  const chain = chains[proxiedAccount.chainId];

  const walletIdentity = chain ? identity[chain.chainId]?.[proxiedAccount.accountId] : null;
  const proxyBasedName = proxyUtils.getProxiedName(proxiedAccount, chain.addressPrefix);

  const flexibleProxyWallet = walletUtils.getWalletFilteredAccounts(wallets, {
    walletFn: (w) => walletUtils.isFlexibleMultisig(w),
    accountFn: (a) =>
      accountUtils.isChainIdMatch(a, proxiedAccount.chainId) &&
      proxiedAccount.connections.some((c) => a.accountId === c.proxyAccountId),
  });

  const wallet: Omit<NoID<ProxiedWallet>, 'accounts' | 'isActive'> = {
    name: walletIdentity ? identityService.getFullName(walletIdentity) : proxyBasedName,
    type: WalletType.PROXIED,
    signingType: SigningType.WATCH_ONLY,
    isHidden: !!flexibleProxyWallet,
  };

  const isEthereumChain = networkUtils.isEthereumBased(chains[proxiedAccount.chainId].options);

  const accounts: Omit<NoID<ProxiedAccount>, 'walletId'>[] = [
    {
      ...proxiedAccount,
      type: 'chain',
      name: walletIdentity ? identityService.getFullName(walletIdentity) : proxyBasedName,
      accountType: AccountType.PROXIED,
      signingType: SigningType.WATCH_ONLY,
      cryptoType: isEthereumChain ? CryptoType.ETHEREUM : CryptoType.SR25519,
    },
  ];

  return { wallet, accounts };
});

const createProxiedWalletsFx = attach({
  source: {
    chains: networkModel.$chains,
    wallets: walletModel.$wallets,
    identity: identity.$list,
  },
  mapParams(proxiedAccounts: PartialProxiedAccount[], { chains, wallets, identity }) {
    return proxiedAccounts.map((proxiedAccount) => ({ identity, proxiedAccount, chains, wallets }));
  },
  effect: series(createProxiedWalletFx),
});

spread({
  source: fetchProxiesFx.doneData,
  targets: {
    proxiesToRemove: proxyModel.events.proxiesRemoved,
    proxiesToAdd: proxyModel.events.proxiesAdded,
    proxiedAccountsToRemove: proxiedAccountsRemoved,
    proxiedAccountsToUpdate: proxiedAccountsUpdated,
  },
});

sample({
  clock: fetchProxiesFx.doneData,
  filter: ({ proxiedAccountsToAdd }) => proxiedAccountsToAdd.length > 0,
  fn: ({ proxiedAccountsToAdd }) => proxiedAccountsToAdd,
  target: createProxiedWalletsFx,
});

sample({
  clock: proxiedAccountsUpdated,
  target: accounts.updateAccounts,
});

sample({
  clock: proxiedAccountsRemoved,
  filter: (proxiedAccounts) => proxiedAccounts.length > 0,
  fn: (proxiedAccounts) => {
    return proxiedAccounts.map((p) => p.walletId);
  },
  target: walletModel.walletsRemoved,
});

sample({
  clock: proxiedAccountsRemoved,
  fn: (proxiedAccounts) => proxiedAccounts.map((p) => p.accountId),
  target: balanceModel.events.balancesRemoved,
});

sample({
  clock: createProxiedWalletsFx.doneData,
  target: series(walletModel.events.proxiedCreated),
});

sample({
  clock: createProxiedWalletsFx.doneData,
  source: {
    chains: networkModel.$chains,
    wallets: walletModel.$wallets,
  },
  fn: ({ chains, wallets }, walletDrafts) => {
    const proxiedAccounts = walletDrafts.flatMap(({ accounts }) => accounts);

    return proxiesUtils.getNotification({
      wallets,
      proxiedAccounts,
      chains,
      type: NotificationType.PROXY_CREATED,
    });
  },
  target: notificationModel.events.notificationsAdded,
});

export const proxiesModel = {
  findAllProxies: findAllProxiesFx,
  createProxiedWalletsFx: createProxiedWalletsFx,
};
