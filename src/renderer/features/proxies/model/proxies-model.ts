import { createEffect, createEvent, createStore, sample, scopeBind } from 'effector';
import { Endpoint, createEndpoint } from '@remote-ui/rpc';
import { keyBy } from 'lodash';
import { once, spread } from 'patronum';

import {
  Account,
  AccountId,
  AccountType,
  Chain,
  ChainId,
  ChainType,
  Connection,
  CryptoType,
  NoID,
  PartialProxiedAccount,
  ProxiedAccount,
  ProxyAccount,
  ProxyChainGroup,
  ProxyDeposits,
  SigningType,
  Wallet,
  WalletType,
} from '@shared/core';
import { isDisabled, networkModel } from '@entities/network';
import { proxyWorkerUtils } from '../lib/utils';
import { accountUtils, walletModel } from '@entities/wallet';
import { proxyModel, proxyUtils } from '@entities/proxy';
import { balanceModel } from '@entities/balance';

const workerStarted = createEvent();

const connected = createEvent<ChainId>();
const proxiedAccountsRemoved = createEvent<ProxiedAccount[]>();
const depositsReceived = createEvent<ProxyDeposits>();

const $endpoint = createStore<Endpoint<any> | null>(null);

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
  const bindedConnected = scopeBind(connected, { safe: true });

  chains.forEach((chain) => {
    if (isDisabled(connections[chain.chainId])) return;

    endpoint.call.initConnection(chain, connections[chain.chainId]).then(() => {
      bindedConnected(chain.chainId);
    });
  });
});

type GetProxiesParams = {
  chainId: ChainId;
  accounts: Account[];
  proxies: ProxyAccount[];
  endpoint: Endpoint<any>;
};
type GetProxiesResult = {
  proxiesToAdd: ProxyAccount[];
  proxiesToRemove: ProxyAccount[];
  proxiedAccountsToAdd: PartialProxiedAccount[];
  proxiedAccountsToRemove: ProxiedAccount[];
  deposits: Record<AccountId, Record<ChainId, string>>;
};
const getProxiesFx = createEffect(
  async ({ chainId, accounts, proxies, endpoint }: GetProxiesParams): Promise<GetProxiesResult> => {
    const proxiedAccounts = accounts.filter((a) => accountUtils.isProxiedAccount(a));
    const nonProxiedAccounts = keyBy(
      accounts.filter((a) => !accountUtils.isProxiedAccount(a)),
      'accountId',
    );

    const result = (await endpoint.call.getProxies(
      chainId,
      nonProxiedAccounts,
      proxiedAccounts,
      proxies,
    )) as Promise<GetProxiesResult>;

    return result;
  },
);

const disconnectFx = createEffect(
  ({ chainId, endpoint }: { chainId: ChainId; endpoint: Endpoint<any> }): Promise<unknown> => {
    return endpoint.call.disconnect(chainId);
  },
);

const createProxiedWalletsFx = createEffect(
  (proxiedAccounts: PartialProxiedAccount[]): { wallet: Wallet; accounts: ProxiedAccount[] }[] => {
    return proxiedAccounts.map((proxied) => {
      const walletName = proxyUtils.getProxiedName(proxied);
      const wallet = {
        name: walletName,
        type: WalletType.PROXIED,
        signingType: SigningType.WATCH_ONLY,
      } as Wallet;

      const accounts = [
        {
          ...proxied,
          name: walletName,
          type: AccountType.PROXIED,
          // TODO: use chain data, when ethereum chains support
          chainType: ChainType.SUBSTRATE,
          cryptoType: CryptoType.SR25519,
        } as ProxiedAccount,
      ];

      return {
        wallet,
        accounts,
      };
    });
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
    chains: Object.values(chains).filter(proxyWorkerUtils.isRegularProxy),
    connections,
    endpoint: endpoint!,
  }),
  target: startChainsFx,
});

sample({
  clock: connected,
  source: {
    accounts: walletModel.$accounts,
    proxies: proxyModel.$proxies,
    endpoint: $endpoint,
  },
  filter: ({ endpoint }) => Boolean(endpoint),
  fn: ({ accounts, proxies, endpoint }, chainId) => ({
    chainId,
    accounts: accounts.filter((a) => accountUtils.isChainIdMatch(a, chainId)),
    proxies: Object.values(proxies).flat(),
    endpoint: endpoint!,
  }),
  target: getProxiesFx,
});

spread({
  source: getProxiesFx.doneData,
  targets: {
    proxiesToAdd: proxyModel.events.proxiesAdded,
    proxiesToRemove: proxyModel.events.proxiesRemoved,
    proxiedAccountsToAdd: createProxiedWalletsFx,
    proxiedAccountsToRemove: proxiedAccountsRemoved,
    deposits: depositsReceived,
  },
});

sample({
  clock: createProxiedWalletsFx.doneData,
  target: walletModel.events.proxiedWalletsCreated,
});

sample({
  clock: proxiedAccountsRemoved,
  fn: (proxiedAccounts) => proxiedAccounts.map((p) => p.walletId),
  target: walletModel.events.walletsRemoved,
});

sample({
  clock: proxiedAccountsRemoved,
  fn: (proxiedAccounts) => proxiedAccounts.map((p) => p.accountId),
  target: balanceModel.events.accountsBalancesRemoved,
});

sample({
  clock: getProxiesFx.done,
  source: $endpoint,
  filter: (endpoint) => Boolean(endpoint),
  fn: (endpoint, { params: { chainId } }) => ({ chainId, endpoint: endpoint! }),
  target: disconnectFx,
});

sample({
  clock: depositsReceived,
  source: {
    wallets: walletModel.$wallets,
    accounts: walletModel.$accounts,
    proxyChainGroups: proxyModel.$proxyChainGroups,
  },
  fn: ({ wallets, accounts, proxyChainGroups }, deposits) => {
    const proxyGroups = wallets.reduce<NoID<ProxyChainGroup>[]>((acc, w) => {
      const walletAccounts = accounts.filter((a) => a.walletId === w.id);

      if (walletAccounts.length > 0) {
        const walletProxyGroups = walletAccounts.reduce<NoID<ProxyChainGroup>[]>((acc, a) => {
          const walletDeposits = deposits[a.accountId];
          if (!walletDeposits) return acc;

          Object.entries(walletDeposits).forEach(([chainId, deposit]) => {
            acc.push({
              walletId: w.id,
              proxiedAccountId: a.accountId,
              chainId: chainId as ChainId,
              totalDeposit: deposit,
            });
          });

          return acc;
        }, []);

        acc.concat(walletProxyGroups);
      }

      return acc;
    }, []);

    const { toAdd, toUpdate } = proxyGroups.reduce<{
      toAdd: NoID<ProxyChainGroup>[];
      toUpdate: NoID<ProxyChainGroup>[];
    }>(
      (acc, g) => {
        if (!proxyChainGroups.some((p) => proxyUtils.isSameProxyChainGroup(p, g))) {
          acc.toAdd.push(g);
        } else {
          acc.toUpdate.push(g);
        }

        return acc;
      },
      {
        toAdd: [],
        toUpdate: [],
      },
    );

    const toRemove = proxyChainGroups.filter((p) => !proxyGroups.some((g) => proxyUtils.isSameProxyChainGroup(g, p)));

    return {
      toAdd,
      toUpdate,
      toRemove,
    };
  },
  target: spread({
    toAdd: proxyModel.events.proxyGroupsAdded,
    toUpdate: proxyModel.events.proxyGroupsUpdated,
    toRemove: proxyModel.events.proxyGroupsRemoved,
  }),
});

export const proxiesModel = {
  events: {
    workerStarted,
  },
};
